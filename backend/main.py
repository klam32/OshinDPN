import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from threading import Lock
from typing import Literal
from urllib.parse import urlencode, urlparse

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .db import INTEGRITY_ERRORS, ROOT, connect, dump, init_db, password_hash, services, settings, verify_password, pages, pricing
from .logic import ai_ready, calculate, deliver_mail, export_order, feedback_admin_message, feedback_customer_message, load_order, process_order, queue_mail, reply_no, workbook

load_dotenv(ROOT / 'backend/.env')

@asynccontextmanager
async def lifespan(app):
    init_db()
    # Recover interrupted SMTP jobs; admins can retry from the outbox.
    with connect() as c:
        c.execute("UPDATE outbox SET status='failed',error='Tiến trình gửi bị gián đoạn; hãy kiểm tra hộp thư trước khi gửi lại.' WHERE status='sending'")
    yield

app = FastAPI(title='Oshin Thời Đại – Đất Phương Nam API', lifespan=lifespan)
attempts = defaultdict(deque)
rate_lock = Lock()

@app.middleware('http')
async def protections(request, call_next):
    if request.url.path.startswith('/api') and request.method not in ('GET', 'HEAD', 'OPTIONS'):
        origins = {value.strip().rstrip('/') for value in os.getenv(
            'ALLOWED_ORIGINS',
            'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000',
        ).split(',') if value.strip()}
        for name in ('VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL'):
            if os.getenv(name):
                origins.add(f"https://{os.environ[name].strip().rstrip('/')}")
        if request.headers.get('origin', '').rstrip('/') not in origins and request.headers.get('origin'):
            return JSONResponse({'detail': 'Nguồn yêu cầu không hợp lệ.'}, status_code=403)
        if request.headers.get('x-requested-with') != 'OshinWeb':
            return JSONResponse({'detail': 'Thiếu xác thực nguồn yêu cầu.'}, status_code=403)
        try:
            if int(request.headers.get('content-length', '0')) > 100000:
                return JSONResponse({'detail': 'Nội dung quá lớn.'}, status_code=413)
        except ValueError:
            return JSONResponse({'detail': 'Yêu cầu không hợp lệ.'}, status_code=400)
        if request.url.path in ('/api/auth/login', '/api/auth/register', '/api/auth/otp/verify', '/api/auth/otp/resend', '/api/chat/send', '/api/orders', '/api/feedback', '/api/contact'):
            key = (request.client.host if request.client else 'local', request.url.path)
            now = time.time()
            with rate_lock:
                # Bound memory and expire inactive clients.
                if len(attempts) > 5000:
                    for k in list(attempts):
                        if not attempts[k] or now - attempts[k][-1] > 60: del attempts[k]
                bucket = attempts[key]
                while bucket and now - bucket[0] > 60: bucket.popleft()
                if len(bucket) >= 20:
                    return JSONResponse({'detail': 'Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.'}, status_code=429)
                bucket.append(now)
    result = await call_next(request)
    result.headers['X-Content-Type-Options'] = 'nosniff'
    result.headers['X-Frame-Options'] = 'DENY'
    result.headers['Referrer-Policy'] = 'same-origin'
    if request.url.path.startswith('/api'): result.headers['Cache-Control'] = 'no-store'
    return result

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={'detail': exc.detail})
    return JSONResponse(status_code=500, content={'detail': f'Lỗi hệ thống ({type(exc).__name__}): {str(exc)}'})

def identity(request: Request, response: Response):
    token = request.cookies.get('oshin_session', '')
    now = time.time()
    with connect() as c:
        session = c.execute('SELECT * FROM sessions WHERE id=? AND expires>?', (token, now)).fetchone()
        user = c.execute('SELECT id,name,email,role,active FROM users WHERE id=?', (session['user_id'],)).fetchone() if session and session['user_id'] else None
        if session and user and not user['active']:
            c.execute('DELETE FROM sessions WHERE id=?', (token,))
            session, user = None, None
        if not session:
            token = secrets.token_urlsafe(32)
            c.execute('INSERT INTO sessions(id,expires) VALUES(?,?)', (token, now + 86400 * 7))
            response.set_cookie('oshin_session', token, httponly=True, samesite='lax', secure=os.getenv('COOKIE_SECURE', 'false').lower() == 'true' or bool(os.getenv('VERCEL')), max_age=86400 * 7)
    return {'session': token, 'owner': user['id'] if user else token, 'user': dict(user) if user else None}

def admin(person=Depends(identity)):
    if not person['user'] or person['user']['role'] != 'admin': raise HTTPException(403, 'Chỉ quản trị viên được phép truy cập.')
    return person

def admin_online():
    with connect() as c:
        return c.execute("SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.role='admin' AND u.active=1 AND s.online=1 AND s.heartbeat>? AND s.expires>? LIMIT 1", (time.time() - 50, time.time())).fetchone() is not None

def active_admin_emails():
    with connect() as c:
        rows = c.execute("SELECT email FROM users WHERE role='admin' AND active=1").fetchall()
    emails = {r['email'].strip().lower() for r in rows if r['email']}
    env_admin = os.getenv('ADMIN_EMAIL', '').strip().lower()
    if env_admin: emails.add(env_admin)
    env_feedback = os.getenv('FEEDBACK_ADMIN_EMAIL', '').strip().lower()
    if env_feedback: emails.add(env_feedback)
    emails.discard('thanhlan.datphuongnam@gmail.com')
    return sorted(list(emails))

def ensure_owner(owner, person):
    if owner != person['owner'] and not (person['user'] and person['user']['role'] == 'admin'): raise HTTPException(404, 'Không tìm thấy dữ liệu.')

class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class Credentials(StrictModel):
    email: str = Field(min_length=5, max_length=200)
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(default='Khách hàng', min_length=2, max_length=100)

    @field_validator('email')
    @classmethod
    def check_email(cls, v):
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', v): raise ValueError('Email không hợp lệ')
        return v.lower()

class OtpVerify(StrictModel):
    challenge_id: str = Field(min_length=32, max_length=64, pattern=r'^[a-f0-9]+$')
    code: str = Field(pattern=r'^\d{6}$')

class OtpResend(StrictModel):
    challenge_id: str = Field(min_length=32, max_length=64, pattern=r'^[a-f0-9]+$')

@app.get('/api/health')
def health(): return {'status': 'ok'}

@app.get('/api/bootstrap')
def bootstrap():
    with connect() as c:
        blogs = [dict(r) for r in c.execute('SELECT * FROM blogs WHERE published=1 ORDER BY created DESC')]
    return {'services': services(True), 'settings': settings(), 'blogs': blogs, 'pages': pages(), 'pricing': pricing(), 'admin_online': admin_online(), 'ai_ready': ai_ready()}

@app.get('/api/auth/me')
def me(person=Depends(identity)): return {'user': person['user']}

def set_session_cookie(response, token):
    response.set_cookie(
        'oshin_session', token, httponly=True, samesite='lax',
        secure=os.getenv('COOKIE_SECURE', 'false').lower() == 'true' or bool(os.getenv('VERCEL')), max_age=86400 * 7,
    )


def authenticate(user, person, response):
    token = secrets.token_urlsafe(32)
    with connect() as c:
        if not person['user']:
            for table in ('orders', 'chats', 'feedback'):
                c.execute(f'UPDATE {table} SET owner=? WHERE owner=?', (user['id'], person['owner']))
        c.execute('DELETE FROM sessions WHERE id=?', (person['session'],))
        c.execute('INSERT INTO sessions(id,user_id,expires) VALUES(?,?,?)', (token, user['id'], time.time() + 86400 * 7))
    set_session_cookie(response, token)
    return {'user': {k: user[k] for k in ('id', 'name', 'email', 'role')}}

def auth_secret():
    value = os.getenv('AUTH_SECRET', '').strip()
    if len(value) < 32:
        raise HTTPException(503, 'AUTH_SECRET chưa được cấu hình an toàn.')
    return value.encode()


def otp_digest(challenge_id, email, code):
    return hmac.new(auth_secret(), f'{challenge_id}:{email}:{code}'.encode(), hashlib.sha256).hexdigest()


def new_otp_code():
    return f'{secrets.randbelow(900000) + 100000:06d}'


def masked_email(email):
    local, domain = email.split('@', 1)
    return f'{local[:2]}***@{domain}'


def send_otp(challenge_id, purpose, email, code):
    action = 'đăng ký tài khoản' if purpose == 'register' else 'đăng nhập'
    subject = f'Mã xác thực {action} – Đất Phương Nam'
    body = f"""Mã xác thực của bạn là: {code}

Mã có hiệu lực trong 5 phút và chỉ dùng được một lần.
Không cung cấp mã này cho bất kỳ ai. Nếu bạn không yêu cầu {action}, hãy bỏ qua email này.

Đất Phương Nam"""
    mail_id = queue_mail('auth_otp', challenge_id, email, subject, body)
    deliver_mail(mail_id)
    with connect() as c:
        status = c.execute('SELECT status FROM outbox WHERE id=?', (mail_id,)).fetchone()['status']
    if status != 'sent':
        raise HTTPException(503, 'Chưa gửi được mã xác thực. Kiểm tra SMTP hoặc thử gửi lại sau.')


def begin_otp(purpose, email, user_id='', name='', password=''):
    now = time.time()
    with connect() as c:
        c.execute('DELETE FROM auth_otp WHERE expires<? OR created<?', (now - 3600, now - 86400))
        recent = c.execute(
            'SELECT COUNT(*) AS total FROM auth_otp WHERE email=? AND purpose=? AND created>?',
            (email, purpose, now - 60),
        ).fetchone()['total']
        if recent >= 3:
            raise HTTPException(429, 'Bạn đã yêu cầu quá nhiều mã. Vui lòng chờ một phút.')
    challenge_id, code = secrets.token_hex(24), new_otp_code()
    with connect() as c:
        c.execute(
            """INSERT INTO auth_otp(
                id,purpose,email,user_id,name,password,code_hash,expires,last_sent,created
            ) VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (challenge_id, purpose, email, user_id, name, password, otp_digest(challenge_id, email, code), now + 300, now, now),
        )
    send_otp(challenge_id, purpose, email, code)
    return {'otp_required': True, 'challenge_id': challenge_id, 'email': masked_email(email), 'expires_in': 300}


@app.post('/api/auth/register')
def register(data: Credentials):
    with connect() as c:
        if c.execute('SELECT 1 FROM users WHERE email=?', (data.email,)).fetchone():
            raise HTTPException(409, 'Email đã được đăng ký.')
    return begin_otp('register', data.email, name=data.name, password=password_hash(data.password))


@app.post('/api/auth/login')
def login(data: Credentials):
    with connect() as c:
        user = c.execute('SELECT * FROM users WHERE email=?', (data.email,)).fetchone()
    valid = verify_password(data.password, user['password']) if user else verify_password(data.password, password_hash('invalid-password'))
    if not user or not valid or not user['active']:
        raise HTTPException(401, 'Email hoặc mật khẩu không chính xác.')
    return begin_otp('login', data.email, user_id=user['id'])


@app.post('/api/auth/otp/verify')
def verify_otp(data: OtpVerify, response: Response, person=Depends(identity)):
    now = time.time()
    with connect() as c:
        row = c.execute('SELECT * FROM auth_otp WHERE id=?', (data.challenge_id,)).fetchone()
        if not row or row['consumed'] or row['expires'] < now or row['attempts'] >= 5:
            raise HTTPException(401, 'Mã xác thực không hợp lệ hoặc đã hết hạn.')
        if not hmac.compare_digest(row['code_hash'], otp_digest(row['id'], row['email'], data.code)):
            c.execute('UPDATE auth_otp SET attempts=attempts+1 WHERE id=?', (row['id'],))
            raise HTTPException(401, 'Mã xác thực không chính xác.')
        c.execute('UPDATE auth_otp SET consumed=1 WHERE id=?', (row['id'],))
        challenge = dict(row)
    if challenge['purpose'] == 'register':
        user = {'id': secrets.token_hex(16), 'name': challenge['name'], 'email': challenge['email'], 'role': 'customer'}
        try:
            with connect() as c:
                c.execute('INSERT INTO users VALUES(?,?,?,?,?,1,?)', (user['id'], user['name'], user['email'], challenge['password'], 'customer', time.time()))
        except INTEGRITY_ERRORS:
            raise HTTPException(409, 'Email đã được đăng ký.')
    else:
        with connect() as c:
            user = c.execute('SELECT * FROM users WHERE id=?', (challenge['user_id'],)).fetchone()
        if not user or not user['active']:
            raise HTTPException(401, 'Tài khoản không còn hoạt động.')
    return authenticate(user, person, response)


@app.post('/api/auth/otp/resend')
def resend_otp(data: OtpResend):
    now = time.time()
    with connect() as c:
        row = c.execute('SELECT * FROM auth_otp WHERE id=?', (data.challenge_id,)).fetchone()
        if not row or row['consumed'] or row['expires'] < now:
            raise HTTPException(401, 'Phiên xác thực đã hết hạn. Vui lòng thực hiện lại.')
        if now - row['last_sent'] < 60:
            raise HTTPException(429, 'Vui lòng chờ 60 giây trước khi gửi lại mã.')
        code = new_otp_code()
        c.execute(
            'UPDATE auth_otp SET code_hash=?,expires=?,attempts=0,last_sent=? WHERE id=?',
            (otp_digest(row['id'], row['email'], code), now + 300, now, row['id']),
        )
    send_otp(row['id'], row['purpose'], row['email'], code)
    return {'ok': True, 'expires_in': 300}


def google_config():
    values = {
        'client_id': os.getenv('GOOGLE_CLIENT_ID', '').strip(),
        'client_secret': os.getenv('GOOGLE_CLIENT_SECRET', '').strip(),
        'redirect_uri': os.getenv('GOOGLE_REDIRECT_URI', '').strip(),
        'frontend_url': os.getenv('FRONTEND_URL', 'http://localhost:5173').strip().rstrip('/'),
    }
    if not all((values['client_id'], values['client_secret'], values['redirect_uri'])):
        raise HTTPException(503, 'Đăng nhập Google chưa được cấu hình.')
    return values


@app.get('/api/auth/google/start')
def google_start(request: Request, person=Depends(identity)):
    config = google_config()
    canonical = urlparse(config['frontend_url'])
    if canonical.netloc and request.url.netloc != canonical.netloc:
        return RedirectResponse(f"{config['frontend_url']}/api/auth/google/start", status_code=302)
    now = time.time()
    state, nonce, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(32), secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    with connect() as c:
        c.execute('DELETE FROM oauth_states WHERE expires<?', (now,))
        c.execute('INSERT INTO oauth_states VALUES(?,?,?,?,?,?)', (state, person['session'], nonce, verifier, now + 600, now))
    params = urlencode({
        'client_id': config['client_id'], 'redirect_uri': config['redirect_uri'], 'response_type': 'code',
        'scope': 'openid email profile', 'state': state, 'nonce': nonce, 'code_challenge': challenge,
        'code_challenge_method': 'S256', 'prompt': 'select_account',
    })
    redirect = RedirectResponse(f'https://accounts.google.com/o/oauth2/v2/auth?{params}', status_code=302)
    set_session_cookie(redirect, person['session'])
    redirect.set_cookie(
        'oshin_oauth_state', state, httponly=True, samesite='lax',
        secure=os.getenv('COOKIE_SECURE', 'false').lower() == 'true' or bool(os.getenv('VERCEL')),
        max_age=600, path='/api/auth/google',
    )
    return redirect


@app.get('/api/auth/google/callback')
def google_callback(request: Request, code: str = '', state: str = '', error: str = '', person=Depends(identity)):
    config = google_config()
    if error:
        return RedirectResponse(f"{config['frontend_url']}/?auth_error=google#account", status_code=303)
    with connect() as c:
        saved = c.execute('SELECT * FROM oauth_states WHERE state=?', (state,)).fetchone()
        oauth_state = request.cookies.get('oshin_oauth_state', '')
        if not saved or saved['expires'] < time.time() or not (
            saved['session_id'] == person['session']
            or (oauth_state and hmac.compare_digest(oauth_state, state))
        ):
            raise HTTPException(400, 'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn.')
        c.execute('DELETE FROM oauth_states WHERE state=?', (state,))
        saved = dict(saved)
    try:
        token_response = httpx.post(
            'https://oauth2.googleapis.com/token',
            data={
                'client_id': config['client_id'], 'client_secret': config['client_secret'], 'code': code,
                'grant_type': 'authorization_code', 'redirect_uri': config['redirect_uri'],
                'code_verifier': saved['code_verifier'],
            }, timeout=20,
        )
        token_response.raise_for_status()
        claims = google_id_token.verify_oauth2_token(token_response.json()['id_token'], GoogleAuthRequest(), config['client_id'])
        if claims.get('nonce') != saved['nonce'] or not claims.get('email_verified'):
            raise ValueError('Invalid Google identity claims')
        email, subject = claims['email'].lower(), claims['sub']
    except (httpx.HTTPError, KeyError, ValueError, GoogleAuthError):
        raise HTTPException(401, 'Không thể xác thực tài khoản Google.')
    with connect() as c:
        user = c.execute('SELECT u.* FROM google_identities g JOIN users u ON u.id=g.user_id WHERE g.sub=?', (subject,)).fetchone()
        if not user:
            user = c.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
            if not user:
                user_id = secrets.token_hex(16)
                name = (claims.get('name') or email.split('@')[0])[:100]
                c.execute('INSERT INTO users VALUES(?,?,?,?,?,1,?)', (user_id, name, email, password_hash(secrets.token_urlsafe(48)), 'customer', time.time()))
                user = c.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
            c.execute('INSERT INTO google_identities VALUES(?,?,?)', (subject, user['id'], time.time()))
        if not user['active']:
            raise HTTPException(403, 'Tài khoản đã bị khóa.')
        user = dict(user)
    redirect = RedirectResponse(f"{config['frontend_url']}/#account", status_code=303)
    authenticate(user, person, redirect)
    redirect.delete_cookie('oshin_oauth_state', path='/api/auth/google')
    return redirect


@app.post('/api/auth/logout')
def logout(response: Response, person=Depends(identity)):
    with connect() as c: c.execute('DELETE FROM sessions WHERE id=?', (person['session'],))
    response.delete_cookie('oshin_session')
    return {'ok': True}

class QuoteInput(StrictModel):
    service_id: str = Field(max_length=80)
    subtype: str = Field(max_length=200)
    mode: Literal['quote', 'survey'] = 'quote'
    details: dict[str, str | int | float] = Field(default_factory=dict, max_length=40)

    @field_validator('details')
    @classmethod
    def validate_details(cls, v):
        if any(len(str(x)) > 3000 for x in v.values()): raise ValueError('Thông tin quá dài')
        return v

class OrderInput(QuoteInput):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r'^(\+84|0)[0-9 .-]{8,13}$')
    email: str = Field(default='', max_length=200)
    address: str = Field(min_length=5, max_length=500)
    preferred_date: str = Field(default='', max_length=30)
    consent: Literal[True]
    request_id: str = Field(min_length=10, max_length=80, pattern=r'^[a-zA-Z0-9-]+$')

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', v): raise ValueError('Email không hợp lệ')
        return v.lower()

@app.post('/api/quotes/preview')
def quote(data: QuoteInput): return calculate(data.service_id, data.subtype, data.details, data.mode)

def public_order(order):
    order.pop('owner', None)
    with connect() as c:
        order['mail'] = [dict(r) for r in c.execute('SELECT recipient,status,error FROM outbox WHERE order_id=?', (order['id'],))]
    return order

@app.post('/api/orders')
def create_order(data: OrderInput, tasks: BackgroundTasks, person=Depends(identity)):
    quote = calculate(data.service_id, data.subtype, data.details, data.mode)
    if data.mode == 'quote' and not data.email: raise HTTPException(422, 'Vui lòng nhập email để nhận chiết tính.')
    order_id = 'DPN-' + data.request_id
    with connect() as c:
        existing = c.execute('SELECT owner FROM orders WHERE id=?', (order_id,)).fetchone()
        if existing:
            ensure_owner(existing['owner'], person)
        else:
            c.execute('INSERT INTO orders(id,owner,data,status,quote,created) VALUES(?,?,?,?,?,?)', (order_id, person['owner'], dump(data.model_dump()), 'new', dump(quote), time.time()))
            admin_emails = active_admin_emails()
            recipients = set(admin_emails)
            if data.email and data.email.strip().lower() != 'thanhlan.datphuongnam@gmail.com':
                recipients.add(data.email.strip().lower())
            recipients.discard('thanhlan.datphuongnam@gmail.com')
            for email in recipients:
                c.execute(
                    """INSERT INTO outbox(
                        id,kind,reference_id,order_id,recipient,subject,body,attach_order,created
                    ) VALUES(?,?,?,?,?,?,?,?,?)""",
                    (secrets.token_hex(12), 'order_received', order_id, order_id, email, '', '', 1, time.time()),
                )
    order = load_order(order_id)
    export_order(order)
    if not existing: tasks.add_task(process_order, order_id)
    return public_order(order)

@app.get('/api/orders')
def orders(person=Depends(identity)):
    with connect() as c:
        ids = [r['id'] for r in c.execute('SELECT id FROM orders WHERE owner=? ORDER BY created DESC', (person['owner'],))]
    return [public_order(load_order(i)) for i in ids]

@app.get('/api/orders/{order_id}/xlsx')
def download(order_id: str, person=Depends(identity)):
    order = load_order(order_id)
    ensure_owner(order['owner'], person)
    return Response(workbook(order), media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers={'Content-Disposition': f'attachment; filename="{order_id}.xlsx"', 'Cache-Control': 'no-store'})

class FeedbackInput(StrictModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=9, max_length=20)
    email: str = Field(min_length=5, max_length=200)
    order_id: str = Field(default='', max_length=100)
    category: Literal['Chất lượng dịch vụ', 'Thanh toán', 'Lỗi website', 'Góp ý khác']
    rating: int = Field(ge=1, le=5)
    subject: str = Field(min_length=5, max_length=200)
    content: str = Field(min_length=10, max_length=5000)
    transaction: str = Field(default='', max_length=200)
    consent: Literal[True]

    @field_validator('email')
    @classmethod
    def validate_feedback_email(cls, value):
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Email không hợp lệ')
        return value.lower()

@app.post('/api/feedback')
def feedback(data: FeedbackInput, tasks: BackgroundTasks, person=Depends(identity)):
    identifier = 'PH-' + secrets.token_hex(5).upper()
    payload = data.model_dump()
    with connect() as c:
        c.execute('INSERT INTO feedback(id,owner,data,created) VALUES(?,?,?,?)', (identifier, person['owner'], dump(payload), time.time()))
    admin_emails = active_admin_emails()
    subject, body = feedback_admin_message(identifier, payload)
    for admin_email in admin_emails:
        mail_id = queue_mail('feedback_admin', identifier, admin_email, subject, body, reply_to=payload['email'])
        if mail_id: tasks.add_task(deliver_mail, mail_id)
    return {'id': identifier, 'mail_queued': bool(admin_emails)}

@app.get('/api/feedback')
def my_feedback(person=Depends(identity)):
    with connect() as c:
        return [{**dict(r), 'data': json.loads(r['data'])} for r in c.execute('SELECT * FROM feedback WHERE owner=? ORDER BY created DESC', (person['owner'],))]


class ContactInput(StrictModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r'^(\+84|0)[0-9 .-]{8,13}$')
    email: str = Field(pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$', max_length=200)
    subject: str = Field(min_length=5, max_length=200)
    content: str = Field(min_length=10, max_length=5000)
    consent: Literal[True]
    request_id: str = Field(min_length=10, max_length=80, pattern=r'^[a-zA-Z0-9-]+$')


@app.post('/api/contact')
def contact(data: ContactInput, tasks: BackgroundTasks, person=Depends(identity)):
    identifier = 'LH-' + data.request_id
    payload = {**data.model_dump(exclude={'request_id'}), 'category': 'Liên hệ tư vấn', 'rating': 0, 'order_id': '', 'transaction': ''}
    with connect() as c:
        existing = c.execute('SELECT owner FROM feedback WHERE id=?', (identifier,)).fetchone()
        if existing:
            ensure_owner(existing['owner'], person)
            return {'id': identifier, 'mail_queued': True}
        c.execute('INSERT INTO feedback(id,owner,data,created) VALUES(?,?,?,?)', (identifier, person['owner'], dump(payload), time.time()))
    admin_emails = active_admin_emails()
    subject, body = feedback_admin_message(identifier, payload)
    for admin_email in admin_emails:
        mail_id = queue_mail('contact_admin', identifier, admin_email, subject, body, reply_to=data.email)
        if mail_id: tasks.add_task(deliver_mail, mail_id)
    return {'id': identifier, 'mail_queued': bool(admin_emails)}

def chat_for(person):
    with connect() as c:
        chat = c.execute('SELECT * FROM chats WHERE owner=? ORDER BY created DESC LIMIT 1', (person['owner'],)).fetchone()
        if chat: return dict(chat)
        identifier = secrets.token_hex(12)
        mode = 'human' if admin_online() else 'ai'
        c.execute('INSERT INTO chats VALUES(?,?,?,?)', (identifier, person['owner'], mode, time.time()))
        return {'id': identifier, 'owner': person['owner'], 'mode': mode}

@app.get('/api/chat')
def chat_state(person=Depends(identity)):
    chat = chat_for(person)
    with connect() as c:
        messages = [dict(r) for r in c.execute('SELECT * FROM messages WHERE chat_id=? ORDER BY id', (chat['id'],))]
    return {'id': chat['id'], 'mode': chat['mode'], 'online': admin_online(), 'messages': messages, 'ai_ready': ai_ready()}

class ChatInput(StrictModel):
    content: str = Field(min_length=1, max_length=2000)
    mode: Literal['ai', 'human'] = 'ai'

@app.post('/api/chat/send')
def send_chat(data: ChatInput, person=Depends(identity)):
    chat = chat_for(person)
    mode = data.mode if admin_online() else 'ai'
    with connect() as c:
        c.execute('UPDATE chats SET mode=? WHERE id=?', (mode, chat['id']))
        c.execute('INSERT INTO messages(chat_id,role,content,created) VALUES(?,?,?,?)', (chat['id'], 'user', data.content, time.time()))
        history = [dict(r) for r in c.execute('SELECT role,content FROM messages WHERE chat_id=? ORDER BY id DESC LIMIT 16', (chat['id'],))][::-1]
    if mode == 'ai':
        answer = reply_no([{'role': 'assistant' if r['role'] == 'admin' else r['role'], 'content': r['content']} for r in history])
        with connect() as c: c.execute('INSERT INTO messages(chat_id,role,content,created) VALUES(?,?,?,?)', (chat['id'], 'assistant', answer, time.time()))
    return chat_state(person)

class Presence(StrictModel): online: bool

@app.post('/api/admin/presence')
def presence(data: Presence, person=Depends(admin)):
    with connect() as c: c.execute('UPDATE sessions SET online=?,heartbeat=? WHERE id=?', (int(data.online), time.time(), person['session']))
    return {'online': admin_online()}

@app.get('/api/admin/dashboard')
def dashboard(person=Depends(admin)):
    with connect() as c:
        all_orders = [public_order(load_order(r['id'])) for r in c.execute('SELECT id FROM orders ORDER BY created DESC')]
        chats = [{**dict(r), 'messages': [dict(m) for m in c.execute('SELECT * FROM messages WHERE chat_id=? ORDER BY id', (r['id'],))]} for r in c.execute('SELECT * FROM chats ORDER BY created DESC')]
        feedbacks = [{**dict(r), 'data': json.loads(r['data'])} for r in c.execute('SELECT * FROM feedback ORDER BY created DESC')]
        users = [dict(r) for r in c.execute('SELECT id,name,email,role,active,created FROM users ORDER BY created DESC')]
        blogs = [dict(r) for r in c.execute('SELECT * FROM blogs ORDER BY created DESC')]
        outbox = [dict(r) for r in c.execute('SELECT * FROM outbox ORDER BY created DESC')]
    return {'orders': all_orders, 'chats': chats, 'feedback': feedbacks, 'users': users, 'services': services(), 'blogs': blogs, 'pages': pages(False), 'pricing': pricing(False), 'settings': settings(), 'outbox': outbox, 'integrations': {'ai': ai_ready(), 'smtp': bool(os.getenv('SMTP_HOST') and os.getenv('SMTP_FROM'))}}

class StatusInput(StrictModel):
    status: Literal['new', 'surveying', 'confirmed', 'in_progress', 'completed', 'paid', 'cancelled']

@app.patch('/api/admin/orders/{identifier}')
def update_order(identifier: str, data: StatusInput, person=Depends(admin)):
    transitions = {'new': ['surveying', 'confirmed', 'cancelled'], 'surveying': ['confirmed', 'cancelled'], 'confirmed': ['in_progress', 'cancelled'], 'in_progress': ['completed'], 'completed': ['paid'], 'paid': [], 'cancelled': []}
    with connect() as c:
        row = c.execute('SELECT status,quote FROM orders WHERE id=?', (identifier,)).fetchone()
        if not row: raise HTTPException(404, 'Không tìm thấy đơn.')
        if data.status != row['status'] and data.status not in transitions[row['status']]: raise HTTPException(422, 'Chuyển trạng thái không hợp lệ. Hãy thực hiện theo quy trình đơn hàng.')
        if data.status in ('confirmed', 'paid') and not json.loads(row['quote']).get('confirmed'): raise HTTPException(422, 'Cần lưu giá thỏa thuận đã xác nhận trước khi tiếp tục.')
        c.execute('UPDATE orders SET status=? WHERE id=?', (data.status, identifier))
    export_order(load_order(identifier))
    return {'ok': True}

class FinalQuote(StrictModel):
    amount: int = Field(ge=0, le=100000000000)
    note: str = Field(min_length=5, max_length=1500)

@app.patch('/api/admin/orders/{identifier}/quote')
def final_quote(identifier: str, data: FinalQuote, person=Depends(admin)):
    order = load_order(identifier)
    if order['status'] in ('completed', 'paid', 'cancelled'): raise HTTPException(422, 'Đơn đã kết thúc, không thể sửa giá.')
    quote = {'service': order['quote']['service'], 'lines': [{'name': data.note, 'quantity': 1, 'unit': 'gói', 'rate': data.amount, 'amount': data.amount}], 'subtotal': data.amount, 'tax': 0, 'tax_percent': 0, 'total': data.amount, 'survey': False, 'confirmed': True, 'note': data.note + ' (Tổng giá đã gồm các khoản thuế/phí theo thỏa thuận.)'}
    with connect() as c: c.execute('UPDATE orders SET quote=? WHERE id=?', (dump(quote), identifier))
    export_order(load_order(identifier))
    return {'ok': True}

class Reply(StrictModel): content: str = Field(min_length=1, max_length=5000)

@app.post('/api/admin/chats/{identifier}/reply')
def admin_reply(identifier: str, data: Reply, person=Depends(admin)):
    with connect() as c:
        if not c.execute('SELECT 1 FROM chats WHERE id=?', (identifier,)).fetchone(): raise HTTPException(404, 'Không tìm thấy hội thoại.')
        c.execute("UPDATE chats SET mode='human' WHERE id=?", (identifier,))
        c.execute('INSERT INTO messages(chat_id,role,content,created) VALUES(?,?,?,?)', (identifier, 'admin', data.content, time.time()))
    return {'ok': True}

class FeedbackReply(StrictModel):
    status: Literal['new', 'processing', 'resolved']
    reply: str = Field(max_length=5000)

@app.patch('/api/admin/feedback/{identifier}')
def update_feedback(identifier: str, data: FeedbackReply, tasks: BackgroundTasks, person=Depends(admin)):
    if data.status == 'resolved' and not data.reply.strip():
        raise HTTPException(422, 'Nhập kết quả xử lý trước khi đóng phản hồi.')
    with connect() as c:
        row = c.execute('SELECT data,status,reply FROM feedback WHERE id=?', (identifier,)).fetchone()
        if not row:
            raise HTTPException(404, 'Không tìm thấy phản hồi.')
        changed = row['status'] != data.status or row['reply'] != data.reply
        c.execute('UPDATE feedback SET status=?,reply=? WHERE id=?', (data.status, data.reply, identifier))
    mail_id = None
    if changed:
        payload = json.loads(row['data'])
        customer_email = payload.get('email', '').strip().lower()
        if customer_email:
            subject, body = feedback_customer_message(identifier, payload, data.status, data.reply)
            admin_reply = (os.getenv('FEEDBACK_ADMIN_EMAIL') or os.getenv('ADMIN_EMAIL') or 'adminluanvann@gmail.com').strip().lower()
            if admin_reply == 'thanhlan.datphuongnam@gmail.com': admin_reply = 'adminluanvann@gmail.com'
            mail_id = queue_mail(
                'feedback_customer', identifier, customer_email, subject, body,
                reply_to=admin_reply,
            )
            tasks.add_task(deliver_mail, mail_id)
    return {'ok': True, 'mail_queued': bool(mail_id)}

class CreateUserInput(StrictModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=200)
    password: str = Field(min_length=8, max_length=128)
    role: Literal['customer', 'admin'] = 'admin'

    @field_validator('email')
    @classmethod
    def check_email(cls, v):
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', v): raise ValueError('Email không hợp lệ')
        return v.lower()

@app.post('/api/admin/users')
def create_user(data: CreateUserInput, person=Depends(admin)):
    email = data.email.strip().lower()
    with connect() as c:
        if c.execute('SELECT 1 FROM users WHERE email=?', (email,)).fetchone():
            raise HTTPException(422, 'Email này đã tồn tại trong hệ thống.')
        identifier = secrets.token_hex(16)
        c.execute(
            'INSERT INTO users(id,name,email,password,role,active,created) VALUES(?,?,?,?,?,?,?)',
            (identifier, data.name.strip(), email, password_hash(data.password), data.role, 1, time.time())
        )
    return {'ok': True, 'id': identifier}

class UserUpdate(StrictModel):
    active: bool
    role: Literal['customer', 'admin']

@app.patch('/api/admin/users/{identifier}')
def update_user(identifier: str, data: UserUpdate, person=Depends(admin)):
    if identifier == person['user']['id']: raise HTTPException(422, 'Không thể thay đổi quyền hoặc khóa chính tài khoản đang sử dụng.')
    with connect() as c:
        if not c.execute('UPDATE users SET active=?,role=? WHERE id=?', (1 if data.active else 0, data.role, identifier)).rowcount: raise HTTPException(404, 'Không tìm thấy tài khoản.')
        c.execute('DELETE FROM sessions WHERE user_id=?', (identifier,))
    return {'ok': True}

class ServiceInput(StrictModel):
    id: str = Field(pattern=r'^[a-z0-9-]{2,80}$')
    name: str = Field(min_length=3, max_length=150)
    tagline: str = Field(max_length=200)
    description: str = Field(max_length=1500)
    icon: str = Field(max_length=30)
    image: str = Field(max_length=500)
    subservices: list[str] = Field(min_length=1, max_length=30)
    fields: list[dict] = Field(min_length=1, max_length=30)
    quantityKey: str = Field(max_length=50)
    unit: str = Field(min_length=1, max_length=30)
    rate: int = Field(ge=0, le=100000000)
    active: bool

    @field_validator('fields')
    @classmethod
    def check_fields(cls, fields):
        keys = set()
        for f in fields:
            if not re.fullmatch('[a-zA-Z][a-zA-Z0-9_]{0,49}', f.get('key', '')) or f['key'] in keys or not f.get('label') or f.get('type') not in ('text', 'number', 'select'): raise ValueError('Cấu trúc trường không hợp lệ')
            if f['type'] == 'select' and not f.get('options'): raise ValueError('Trường chọn cần có các lựa chọn')
            if f['type'] == 'number' and (not isinstance(f.get('min', 0), (int, float)) or not isinstance(f.get('max', 100000), (int, float)) or f.get('min', 0) < 0 or f.get('max', 100000) < f.get('min', 0)): raise ValueError('Giới hạn số không hợp lệ')
            keys.add(f['key'])
        return fields

@app.put('/api/admin/services/{identifier}')
def save_service(identifier: str, data: ServiceInput, person=Depends(admin)):
    if identifier != data.id: raise HTTPException(422, 'Mã dịch vụ không khớp.')
    if not any(f['key'] == data.quantityKey and f['type'] == 'number' and f.get('required') for f in data.fields): raise HTTPException(422, 'Trường tính khối lượng phải là số bắt buộc.')
    required = {'housekeeping': ['sessions'], 'labor': ['days'], 'moving': ['distance']}.get(identifier, [])
    if any(not any(f['key'] == k and f['type'] == 'number' and f.get('required') for f in data.fields) for k in required): raise HTTPException(422, 'Cần giữ trường hệ số tính giá của dịch vụ.')
    with connect() as c: c.execute('INSERT INTO services VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', (identifier, dump(data.model_dump())))
    return {'ok': True}

class BlogInput(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)
    title: str = Field(min_length=3, max_length=250)
    category: str = Field(default='Tin mới', min_length=1, max_length=100)
    excerpt: str = Field(default='', max_length=1000)
    body: str = Field(min_length=1, max_length=50000)
    image: str = Field(default='', max_length=500)
    published: bool = True
    author: str = Field(default='Khoa Lam', max_length=100)
    tags: list[str] = Field(default_factory=list)
    seo_title: str = Field(default='', max_length=250)
    seo_description: str = Field(default='', max_length=500)
    template: str = Field(default='article', max_length=50)

@app.put('/api/admin/blogs/{identifier}')
def save_blog(identifier: str, data: BlogInput, person=Depends(admin)):
    if not re.fullmatch(r'[a-zA-Z0-9-]{1,80}', identifier): raise HTTPException(422, 'Mã bài viết không hợp lệ.')
    with connect() as c: c.execute('INSERT INTO blogs VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,category=excluded.category,excerpt=excluded.excerpt,body=excluded.body,image=excluded.image,published=excluded.published', (identifier, data.title, data.category, data.excerpt or data.title[:150], data.body, data.image or '/images/hero.jpg', 1 if data.published else 0, time.time()))
    return {'ok': True}

@app.delete('/api/admin/blogs/{identifier}')
def delete_blog(identifier: str, person=Depends(admin)):
    with connect() as c: c.execute('DELETE FROM blogs WHERE id=?', (identifier,))
    return {'ok': True}

class SettingsInput(StrictModel):
    company_name: str = Field(min_length=5, max_length=150)
    hotline: str = Field(min_length=9, max_length=30)
    email: str = Field(pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$', max_length=200)
    address: str = Field(min_length=5, max_length=300)
    hero_title: str = Field(min_length=5, max_length=150)
    hero_description: str = Field(min_length=10, max_length=500)
    tax_percent: float = Field(ge=0, le=100)
    moving_km_rate: int = Field(ge=0, le=10000000)
    bank_name: str = Field(max_length=100)
    bank_account: str = Field(max_length=100)
    bank_owner: str = Field(max_length=100)
    qr_image: str = Field(max_length=500)
    quote_note: str = Field(min_length=10, max_length=1000)
    legal_name: str = Field(default='', max_length=200)
    tax_code: str = Field(default='', max_length=30)
    landline: str = Field(default='', max_length=30)
    working_hours: str = Field(default='', max_length=300)
    map_url: str = Field(default='https://maps.app.goo.gl/57dZpeMw67tToEGt7', pattern=r'^https://', max_length=500)

    @field_validator('qr_image')
    @classmethod
    def validate_image(cls, v):
        if v and not (v.startswith('https://') or (v.startswith('/images/') and '..' not in v)): raise ValueError('QR phải là URL HTTPS hoặc đường dẫn /images/')
        return v

@app.put('/api/admin/settings')
def save_settings(data: SettingsInput, person=Depends(admin)):
    with connect() as c: c.execute('UPDATE settings SET data=? WHERE id=1', (dump(data.model_dump()),))
    return {'ok': True}

class PageInput(BaseModel):
    model_config = ConfigDict(extra='ignore', str_strip_whitespace=True)

    title: str = Field(min_length=5, max_length=180)
    nav_title: str = Field(min_length=2, max_length=80)
    excerpt: str = Field(min_length=5, max_length=500)
    body: str = Field(min_length=20, max_length=20000)
    image: str = Field(max_length=500)
    source_url: str = Field(default='', max_length=500)
    published: bool

    @field_validator('image', 'source_url')
    @classmethod
    def safe_url(cls, value):
        if value and not (value.startswith('https://') or (value.startswith('/images/') and '..' not in value)):
            raise ValueError('Dùng đường dẫn HTTPS hoặc /images/.')
        return value


@app.put('/api/admin/pages/{identifier}')
def save_page(identifier: str, data: PageInput, person=Depends(admin)):
    with connect() as c:
        row = c.execute('SELECT data FROM site_content WHERE id=?', (identifier,)).fetchone()
        if not row:
            raise HTTPException(404, 'Không tìm thấy trang.')
        page_dict = json.loads(row['data'])
        page_dict.update(data.model_dump())
        c.execute('UPDATE site_content SET data=? WHERE id=?', (dump(page_dict), identifier))
    return {'ok': True}



class PricingInput(StrictModel):
    name: str = Field(min_length=3, max_length=200)
    group: str = Field(min_length=3, max_length=150)
    service_id: str = Field(max_length=80)
    subtype: str = Field(max_length=200)
    unit: str = Field(min_length=1, max_length=50)
    min_rate: int = Field(ge=0, le=100000000)
    max_rate: int = Field(ge=0, le=100000000)
    note: str = Field(max_length=1000)
    survey_only: bool
    active: bool


@app.put('/api/admin/pricing/{identifier}')
def save_pricing(identifier: str, data: PricingInput, person=Depends(admin)):
    if not re.fullmatch(r'[a-zA-Z0-9-]{1,80}', identifier):
        raise HTTPException(422, 'Mã hạng mục không hợp lệ.')
    service = next((s for s in services() if s['id'] == data.service_id), None)
    if not service or data.subtype not in service['subservices'] or data.max_rate < data.min_rate:
        raise HTTPException(422, 'Kiểm tra loại dịch vụ và khoảng đơn giá từ–đến.')
    if not data.survey_only and data.min_rate <= 0:
        raise HTTPException(422, 'Hạng mục tính giá cần đơn giá lớn hơn 0.')
    with connect() as c:
        c.execute('INSERT INTO price_items VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', (identifier, dump({'id': identifier, **data.model_dump()})))
    return {'ok': True}


@app.post('/api/admin/outbox/{identifier}/retry')
def retry(identifier: str, tasks: BackgroundTasks, person=Depends(admin)):
    with connect() as c:
        row = c.execute('SELECT status FROM outbox WHERE id=?', (identifier,)).fetchone()
        if not row: raise HTTPException(404, 'Không tìm thấy email.')
        if row['status'] in ('sent', 'sending'): raise HTTPException(422, 'Email đã gửi hoặc đang gửi.')
    tasks.add_task(deliver_mail, identifier)
    return {'ok': True}

if not os.getenv('VERCEL') and (ROOT / 'dist').exists():
    app.mount('/', StaticFiles(directory=ROOT / 'dist', html=True), name='web')
