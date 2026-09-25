import { useCallback, useEffect, useRef, useState } from 'react';
import { api, date, statuses } from '../lib/api';
import { Empty, ErrorNotice, Field, Icon, Modal, NoAvatar } from './ui';
import { QuoteTable } from './Booking';

export function Auth({ onClose, onAuth }) {
  const [register, setRegister] = useState(false),
    [challenge, setChallenge] = useState(null),
    [code, setCode] = useState(''),
    [resendIn, setResendIn] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!resendIn) return undefined;
    const timer = setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await api(`/auth/${register ? 'register' : 'login'}`, {
        method: 'POST',
        body: data,
      });
      setChallenge(result);
      setCode('');
      setResendIn(60);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api('/auth/otp/verify', {
        method: 'POST',
        body: { challenge_id: challenge.challenge_id, code },
      });
      onAuth(result.user);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    setBusy(true);
    try {
      await api('/auth/otp/resend', {
        method: 'POST',
        body: { challenge_id: challenge.challenge_id },
      });
      setResendIn(60);
      setCode('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (challenge) {
    return (
      <Modal title="Nhập mã xác thực" onClose={onClose}>
        <form className="auth-form" onSubmit={verify}>
          <div className="auth-illustration">
            <Icon name="mail" size={36} />
            <span>Mã OTP đã gửi đến {challenge.email}</span>
          </div>
          <p>Mã gồm 6 chữ số, có hiệu lực trong 5 phút và chỉ được sử dụng một lần.</p>
          <Field
            label="Mã xác thực OTP"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            required
            minLength={6}
            maxLength={6}
            placeholder="000000"
          />
          <ErrorNotice error={error} />
          <button className="button primary full" disabled={busy || code.length !== 6}>
            {busy ? 'Đang xác thực...' : 'Xác nhận mã OTP'}
            <Icon name="arrow" />
          </button>
          <div className="otp-actions">
            <button type="button" className="text-button" onClick={() => setChallenge(null)}>
              Quay lại
            </button>
            <button type="button" className="text-button" disabled={busy || resendIn > 0} onClick={resend}>
              {resendIn ? `Gửi lại sau ${resendIn}s` : 'Gửi lại mã'}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal title={register ? 'Tạo tài khoản của bạn' : 'Chào bạn trở lại!'} onClose={onClose}>
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-illustration">
          <Icon name="home" size={36} />
          <span>Mọi yêu cầu, trong một tài khoản.</span>
        </div>
        <p>Mật khẩu đúng vẫn cần mã OTP gửi qua email để hoàn tất xác thực.</p>
        {register && (
          <Field
            label="Họ và tên"
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
        )}
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field
          label="Mật khẩu"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete={register ? 'new-password' : 'current-password'}
          placeholder="Ít nhất 8 ký tự"
        />
        <ErrorNotice error={error} />
        <button className="button primary full" disabled={busy}>
          {busy ? 'Đang gửi mã...' : register ? 'Đăng ký và nhận OTP' : 'Đăng nhập và nhận OTP'}
          <Icon name="arrow" />
        </button>
        <div className="auth-divider"><span>hoặc</span></div>
        <button
          className="button secondary full"
          type="button"
          disabled={busy}
          onClick={() => window.location.assign('/api/auth/google/start')}
        >
          <b className="google-mark" aria-hidden="true">G</b>
          Tiếp tục với Google
        </button>
        <p className="auth-switch">
          {register ? 'Đã có tài khoản?' : 'Bạn chưa có tài khoản?'}{' '}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setRegister(!register);
              setError('');
            }}
          >
            {register ? 'Đăng nhập' : 'Đăng ký ngay'}
          </button>
        </p>
        <small className="muted">
          Tài khoản quản trị cũng cần OTP khi đăng nhập bằng mật khẩu.
        </small>
      </form>
    </Modal>
  );
}

export function Feedback({ user, onClose }) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null),
    [category, setCategory] = useState('Chất lượng dịch vụ'),
    [rating, setRating] = useState(5);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      setResult(
        await api('/feedback', {
          method: 'POST',
          body: { ...data, category, rating, consent: true },
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Phản hồi & báo lỗi" onClose={onClose}>
      {result ? (
        <div className="booking-success">
          <span className="success-icon">
            <Icon name="check" size={32} />
          </span>
          <h2>Chúng tôi đã lắng nghe.</h2>
          <p>
            Mã phản hồi: <b>{result.id}</b>. Admin đã nhận thông báo qua email. Kết quả xử lý sẽ hiển thị tại “Yêu cầu của tôi” và được gửi đến email bạn đã cung cấp.
          </p>
          <button
            className="button primary"
            onClick={() => {
              location.hash = 'account';
              onClose();
            }}
          >
            Theo dõi phản hồi
          </button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <p>
            Mỗi góp ý giúp chúng tôi chăm sóc bạn tốt hơn. Hãy mô tả vấn đề để nhân viên kiểm tra.
          </p>
          <div className="form-grid">
            <Field
              label="Họ và tên"
              name="name"
              required
              minLength={2}
              defaultValue={user?.name || ''}
            />
            <Field
              label="Số điện thoại"
              name="phone"
              type="tel"
              required
              minLength={9}
              maxLength={20}
            />
          </div>
          <Field
            label="Email nhận kết quả xử lý"
            type="email"
            name="email"
            required
            defaultValue={user?.email || ''}
          />
          <div className="form-grid">
            <Field label="Vấn đề">
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {['Chất lượng dịch vụ', 'Thanh toán', 'Lỗi website', 'Góp ý khác'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Mã yêu cầu (nếu có)" name="order_id" placeholder="DPN-..." />
          </div>
          {category === 'Thanh toán' && (
            <Field
              label="Mã giao dịch / thời điểm thanh toán"
              name="transaction"
              placeholder="Không nhập mật khẩu, OTP hoặc thông tin thẻ"
            />
          )}
          <Field label="Tiêu đề" name="subject" required minLength={5} maxLength={200} />
          <Field label="Nội dung chi tiết">
            <textarea
              name="content"
              required
              minLength={10}
              maxLength={5000}
              rows={4}
              placeholder="Vấn đề đã xảy ra như thế nào? Bạn mong muốn được hỗ trợ ra sao?"
            />
          </Field>
          <div className="rating-picker">
            <span>Trải nghiệm của bạn</span>
            <div>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  aria-label={`${n} sao`}
                  aria-pressed={rating === n}
                  className={n <= rating ? 'selected' : ''}
                  key={n}
                  onClick={() => setRating(n)}
                >
                  <Icon name="star" size={26} />
                </button>
              ))}
            </div>
          </div>
          <label className="checkbox-label">
            <input type="checkbox" required />
            <span>Tôi đồng ý cung cấp thông tin để công ty liên hệ và xử lý phản hồi.</span>
          </label>
          <ErrorNotice error={error} />
          <button className="button primary full" disabled={busy}>
            {busy ? 'Đang gửi...' : 'Gửi phản hồi'}
            <Icon name="send" />
          </button>
        </form>
      )}
    </Modal>
  );
}

export function Chat({ open, setOpen, sessionKey }) {
  const [state, setState] = useState({ messages: [], online: false, ai_ready: false }),
    [mode, setMode] = useState('ai');
  const [input, setInput] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const bottom = useRef(null),
    fetched = useRef(false),
    choice = useRef(false),
    wasOnline = useRef(false);
  useEffect(() => {
    fetched.current = false;
    choice.current = false;
    setState({ messages: [], online: false });
    setInput('');
  }, [sessionKey]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      try {
        const s = await api('/chat');
        if (active) {
          setState(s);
          if (!fetched.current || (s.online && !wasOnline.current && !choice.current))
            setMode(s.online ? 'human' : 'ai');
          if (!s.online) setMode('ai');
          wasOnline.current = s.online;
          fetched.current = true;
          setError('');
        }
      } catch (e) {
        if (active) setError(e.message);
      }
    };
    load();
    const id = setInterval(load, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [open, sessionKey]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [state.messages.length, busy]);
  async function send(text) {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError('');
    try {
      setState(await api('/chat/send', { method: 'POST', body: { content: text.trim(), mode } }));
      setInput('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className={`chat-launcher ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Đóng trò chuyện' : 'Trò chuyện với Nở'}
      >
        {open ? (
          <Icon name="close" size={25} />
        ) : (
          <>
            <NoAvatar small />
            <span>
              <b>Trò chuyện với Nở</b>
              <small>Luôn ở đây để giúp bạn</small>
            </span>
            <i className="online-dot" />
          </>
        )}
      </button>
      {open && (
        <section className="chat-panel" aria-label="Tư vấn khách hàng">
          <header>
            <NoAvatar />
            <span>
              <b>
                {mode === 'human' && state.online
                  ? 'Tư vấn viên Đất Phương Nam'
                  : 'Nở – Trợ lý của bạn'}
              </b>
              <small>
                <i className="online-dot" />
                {state.online
                  ? 'Nhân viên đang trực tuyến'
                  : state.ai_ready
                    ? 'Trợ lý AI sẵn sàng hỗ trợ'
                    : 'Tư vấn tự động cơ bản'}
              </small>
            </span>
            <button
              className="icon-button"
              aria-label="Thu nhỏ trò chuyện"
              onClick={() => setOpen(false)}
            >
              <Icon name="down" />
            </button>
          </header>
          {state.online && (
            <div className="chat-modes">
              <button
                className={mode === 'human' ? 'active' : ''}
                onClick={() => {
                  choice.current = true;
                  setMode('human');
                }}
              >
                Tư vấn trực tiếp
              </button>
              <button
                className={mode === 'ai' ? 'active' : ''}
                onClick={() => {
                  choice.current = true;
                  setMode('ai');
                }}
              >
                Hỏi Nở
              </button>
            </div>
          )}
          <div className="chat-messages" aria-live="polite">
            <div className="chat-date">Hỗ trợ từ Đất Phương Nam</div>
            <div className="message assistant">
              <small>Nở</small>Dạ, chào bạn! Mình là Nở 🌼
              <br />
              Bạn cứ chia sẻ điều cần giúp, Nở sẽ cùng bạn tìm dịch vụ phù hợp nhé.
            </div>
            {state.messages.map((m) => (
              <div className={`message ${m.role}`} key={m.id}>
                <small>
                  {m.role === 'user' ? 'Bạn' : m.role === 'admin' ? 'Tư vấn viên' : 'Nở'}
                </small>
                {m.content}
              </div>
            ))}
            {!state.messages.length && (
              <div className="quick-replies">
                {['Tôi cần dọn vệ sinh', 'Tư vấn di dời', 'Tôi muốn đặt khảo sát'].map((t) => (
                  <button disabled={busy} key={t} onClick={() => send(t)}>
                    {t}
                    <Icon name="arrow" size={14} />
                  </button>
                ))}
              </div>
            )}
            {busy && <div className="typing">Đang gửi và xử lý tin nhắn…</div>}
            {state.messages.at(-1)?.role === 'user' && state.online && (
              <p className="fine-print">
                Tin nhắn đã chuyển đến nhân viên. Bạn có thể tiếp tục mô tả nhu cầu.
              </p>
            )}
            <div ref={bottom} />
          </div>
          <ErrorNotice error={error} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              aria-label="Tin nhắn tư vấn"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
              placeholder="Bạn cần Nở giúp gì hôm nay?"
            />
            <button aria-label="Gửi tin nhắn" disabled={busy || !input.trim()}>
              <Icon name="send" size={20} />
            </button>
          </form>
          <footer>Thông tin tư vấn cần được nhân viên xác nhận.</footer>
        </section>
      )}
    </>
  );
}

export function Account({ user, settings, openAuth, openBooking, openFeedback }) {
  const [orders, setOrders] = useState([]),
    [feedback, setFeedback] = useState([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const [o, f] = await Promise.all([api('/orders'), api('/feedback')]);
      setOrders(o);
      setFeedback(f);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);
  return (
    <main className="account-page container">
      <a href="#" className="text-button">
        ← Trở về trang chủ
      </a>
      <div className="section-heading">
        <div>
          <span className="eyebrow">GÓC CỦA BẠN</span>
          <h1>{user ? `Xin chào, ${user.name}` : 'Yêu cầu của tôi'}</h1>
          <p>Theo dõi từng bước, an tâm từng dịch vụ.</p>
        </div>
        <button className="button primary" onClick={() => openBooking()}>
          <Icon name="plus" /> Đặt dịch vụ
        </button>
      </div>
      {!user && (
        <div className="info-box">
          <Icon name="user" />
          <p>
            Đang hiển thị yêu cầu của trình duyệt này.{' '}
            <button className="text-button" onClick={openAuth}>
              Đăng nhập hoặc đăng ký
            </button>{' '}
            để lưu vào tài khoản.
          </p>
        </div>
      )}
      <ErrorNotice error={error} />
      {loading ? (
        <p>Đang tải yêu cầu...</p>
      ) : !orders.length ? (
        <Empty
          title="Chưa có yêu cầu nào"
          text="Chọn dịch vụ bạn cần, chúng tôi sẽ đồng hành từ bước đầu tiên."
        />
      ) : (
        <div className="order-list">
          {orders.map((o) => (
            <article className="order-card" key={o.id}>
              <div className="order-header">
                <span>
                  <small>{date(o.created)}</small>
                  <h3>{o.quote.service}</h3>
                  <code>{o.id}</code>
                </span>
                <span className={`status ${o.status}`}>{statuses[o.status]}</span>
              </div>
              <p>
                {o.data.subtype} · {o.data.address}
              </p>
              <QuoteTable quote={o.quote} />
              {o.summary && <p className="info-box">{o.summary}</p>}
              <div className="order-actions">
                <a className="button secondary small" href={`/api/orders/${o.id}/xlsx`}>
                  <Icon name="download" size={16} /> Tải Excel
                </a>
                <button className="text-button" onClick={openFeedback}>
                  Phản hồi về dịch vụ
                </button>
              </div>
              <div className="mail-status">
                {o.mail.map((m) => (
                  <small key={m.recipient}>
                    <Icon name="mail" size={13} /> {m.recipient}: {statuses[m.status]}
                  </small>
                ))}
              </div>
              {['completed', 'paid'].includes(o.status) && (
                <div className="payment-box">
                  <div>
                    {settings.qr_image && o.quote.confirmed ? (
                      <img src={settings.qr_image} alt="Mã QR thanh toán do công ty cung cấp" />
                    ) : (
                      <div className="qr-placeholder">
                        <Icon name="qr" size={58} />
                        <small>KHUNG QR THANH TOÁN</small>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3>
                      {o.status === 'paid'
                        ? 'Đã xác nhận thanh toán'
                        : 'Thanh toán sau khi hoàn thành'}
                    </h3>
                    <p>
                      {!o.quote.confirmed
                        ? 'Nhân viên cần xác nhận giá cuối cùng trước khi thanh toán.'
                        : settings.qr_image
                          ? 'Kiểm tra tên người nhận, số tiền và ghi mã yêu cầu trong nội dung chuyển khoản.'
                          : 'Công ty sẽ cung cấp mã QR và thông tin thanh toán. Vui lòng liên hệ nhân viên.'}
                    </p>
                    {settings.bank_name && (
                      <p>
                        {settings.bank_name}
                        <br />
                        <b>
                          {settings.bank_account} · {settings.bank_owner}
                        </b>
                      </p>
                    )}
                    <small>Trạng thái thanh toán được Admin xác nhận sau khi đối soát.</small>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <div className="section-heading compact">
        <h2>Phản hồi của bạn</h2>
        <button className="text-button" onClick={openFeedback}>
          Gửi phản hồi <Icon name="arrow" size={16} />
        </button>
      </div>
      {feedback.length ? (
        feedback.map((f) => (
          <article className="order-card" key={f.id}>
            <span className={`status ${f.status}`}>{statuses[f.status]}</span>
            <h3>{f.data.subject}</h3>
            <p>{f.data.content}</p>
            <small>
              {f.id} · {date(f.created)}
            </small>
            {f.reply && (
              <div className="info-box">
                <p>
                  <b>Đất Phương Nam phản hồi:</b>
                  <br />
                  {f.reply}
                </p>
              </div>
            )}
          </article>
        ))
      ) : (
        <p className="muted">Bạn chưa gửi phản hồi nào.</p>
      )}
    </main>
  );
}
