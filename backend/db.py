import hashlib
import json
import os
import secrets
import sqlite3
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def db_path():
    return Path(os.getenv('DATABASE_PATH', str(ROOT / 'backend/data/oshin.db')))

@contextmanager
def connect():
    con = sqlite3.connect(db_path(), timeout=20)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()

def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1).hex()
    return f'{salt}:{digest}'

def verify_password(password, stored):
    return secrets.compare_digest(password_hash(password, stored.split(':')[0]), stored)

def dump(value):
    return json.dumps(value, ensure_ascii=False)

DEFAULT_SETTINGS = {
    'company_name': 'Oshin Thời Đại – Đất Phương Nam',
    'hotline': '0901 040 484',
    'email': 'thanhlan.datphuongnam@gmail.com',
    'address': 'Cần Thơ và Đồng bằng sông Cửu Long',
    'hero_title': 'Nhà sạch thảnh thơi.\nCuộc sống rạng ngời.',
    'hero_description': 'Từ tổ ấm đến nơi làm việc, Đất Phương Nam chăm chút từng không gian để bạn an tâm dành thời gian cho những điều yêu thương.',
    'tax_percent': 0, 'moving_km_rate': 15000,
    'bank_name': '', 'bank_account': '', 'bank_owner': '', 'qr_image': '',
    'quote_note': 'Đơn giá minh họa, chưa phải báo giá chính thức. Chi phí cuối cùng được xác nhận sau khảo sát và thống nhất phạm vi công việc.',
}

def init_db():
    db_path().parent.mkdir(parents=True, exist_ok=True)
    with connect() as c:
        c.execute('PRAGMA journal_mode=WAL')
        c.executescript('''
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', active INTEGER DEFAULT 1, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), expires REAL NOT NULL, online INTEGER DEFAULT 0, heartbeat REAL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS services(id TEXT PRIMARY KEY, data TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS blogs(id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, excerpt TEXT NOT NULL, body TEXT NOT NULL, image TEXT NOT NULL, published INTEGER DEFAULT 1, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL, status TEXT NOT NULL, quote TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS chats(id TEXT PRIMARY KEY, owner TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'ai', created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL REFERENCES chats(id), role TEXT NOT NULL, content TEXT NOT NULL, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', reply TEXT DEFAULT '', created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY, kind TEXT NOT NULL DEFAULT 'order_received', reference_id TEXT NOT NULL, order_id TEXT REFERENCES orders(id) ON DELETE SET NULL, recipient TEXT NOT NULL, reply_to TEXT DEFAULT '', subject TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', attach_order INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', error TEXT DEFAULT '', created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS auth_otp(id TEXT PRIMARY KEY, purpose TEXT NOT NULL, email TEXT NOT NULL, user_id TEXT DEFAULT '', name TEXT DEFAULT '', password TEXT DEFAULT '', code_hash TEXT NOT NULL, expires REAL NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_sent REAL NOT NULL, consumed INTEGER NOT NULL DEFAULT 0, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS oauth_states(state TEXT PRIMARY KEY, session_id TEXT NOT NULL, nonce TEXT NOT NULL, code_verifier TEXT NOT NULL, expires REAL NOT NULL, created REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS google_identities(sub TEXT PRIMARY KEY, user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE, created REAL NOT NULL);
        ''')
        outbox_columns = {row['name'] for row in c.execute('PRAGMA table_info(outbox)')}
        if 'kind' not in outbox_columns:
            c.execute('ALTER TABLE outbox RENAME TO outbox_legacy')
            c.execute("""CREATE TABLE outbox(
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL DEFAULT 'order_received',
                reference_id TEXT NOT NULL,
                order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
                recipient TEXT NOT NULL,
                reply_to TEXT DEFAULT '',
                subject TEXT NOT NULL DEFAULT '',
                body TEXT NOT NULL DEFAULT '',
                attach_order INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',
                error TEXT DEFAULT '',
                created REAL NOT NULL
            )""")
            c.execute("""INSERT INTO outbox(
                id,kind,reference_id,order_id,recipient,reply_to,subject,body,attach_order,status,error,created
            ) SELECT id,'order_received',order_id,order_id,recipient,'','','',1,status,error,created
              FROM outbox_legacy""")
            c.execute('DROP TABLE outbox_legacy')
        c.execute('CREATE INDEX IF NOT EXISTS idx_outbox_order ON outbox(order_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_outbox_reference ON outbox(reference_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_auth_otp_email ON auth_otp(email,purpose,created)')
        c.execute('INSERT OR IGNORE INTO settings VALUES(1,?)', (dump(DEFAULT_SETTINGS),))
        for service in json.loads((ROOT / 'src/data/catalog.json').read_text(encoding='utf-8')):
            c.execute('INSERT OR IGNORE INTO services VALUES(?,?)', (service['id'], dump(service)))
        import time
        articles = [
            ('clean-home', 'Một ngôi nhà sạch bắt đầu từ những thói quen nhỏ', 'Mẹo chăm sóc nhà', 'Gợi ý sắp xếp lịch vệ sinh để tổ ấm luôn gọn gàng mà vẫn có thời gian cho bản thân.', 'Chia việc theo từng khu vực: bếp, phòng khách, phòng ngủ và nhà tắm. Ưu tiên lau các bề mặt sử dụng hằng ngày và thông gió khi dọn dẹp.\n\nVới những hạng mục cần thiết bị chuyên dụng, hãy mô tả diện tích, hiện trạng và thời gian mong muốn để đội ngũ tư vấn chuẩn bị phương án phù hợp.\n\nBạn có thể chọn dịch vụ vệ sinh hoặc đặt khảo sát ngay trên website.', '/images/hero.jpg'),
            ('moving-plan', 'Chuyển văn phòng: chuẩn bị gì để mọi việc nhẹ nhàng?', 'Kinh nghiệm dịch vụ', 'Một danh sách chuẩn bị đơn giản giúp quá trình đóng gói và di dời dễ theo dõi hơn.', 'Lập danh sách tài sản theo từng phòng, ghi rõ số lượng và đánh dấu đồ dễ vỡ. Sao lưu dữ liệu trước khi di chuyển thiết bị.\n\nCung cấp địa chỉ đi và đến, số tầng, tình trạng thang máy và khung giờ được vận chuyển. Những thông tin này giúp nhân viên xây dựng phương án và chiết tính chính xác hơn.', '/images/service-2.jpg'),
            ('green-office', 'Mang một chút xanh đến góc làm việc của bạn', 'Không gian sống', 'Chăm cây đúng cách từ ánh sáng, lượng nước đến lịch chăm sóc định kỳ.', 'Quan sát ánh sáng tại vị trí đặt cây và chọn loại cây phù hợp. Kiểm tra độ ẩm đất trước khi tưới, tránh để nước đọng ở chậu.\n\nNếu cây vàng lá hoặc sinh trưởng chậm, ghi lại tình trạng và số lượng cây để đội ngũ chăm sóc cảnh quan tư vấn hoặc đến khảo sát.', '/images/service-4.jpg'),
        ]
        for a in articles:
            c.execute('INSERT OR IGNORE INTO blogs VALUES(?,?,?,?,?,?,1,?)', (*a, time.time()))
        email, password = os.getenv('ADMIN_EMAIL'), os.getenv('ADMIN_PASSWORD')
        if email and password:
            if len(password) < 12:
                raise RuntimeError('ADMIN_PASSWORD must have at least 12 characters')
            c.execute('INSERT OR IGNORE INTO users VALUES(?,?,?,?,?,1,?)', (secrets.token_hex(16), 'Quản trị viên', email.lower(), password_hash(password), 'admin', time.time()))

def settings():
    with connect() as c:
        return json.loads(c.execute('SELECT data FROM settings WHERE id=1').fetchone()['data'])

def services(active=False):
    with connect() as c:
        rows = [json.loads(r['data']) for r in c.execute('SELECT data FROM services')]
    return [s for s in rows if s['active']] if active else rows
