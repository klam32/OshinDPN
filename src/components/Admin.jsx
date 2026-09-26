import { useCallback, useEffect, useRef, useState } from 'react';
import { api, date, money, statuses } from '../lib/api';
import { Empty, ErrorNotice, Field, Icon, Logo, Modal } from './ui';
import { QuoteTable } from './Booking';
import { ContentPanel, PageEditor, PriceEditor, PricingPanel } from './ContentAdmin';

const tabs = [
  ['overview', 'grid', 'Tổng quan'],
  ['orders', 'file', 'Yêu cầu & báo giá'],
  ['chat', 'chat', 'Tư vấn trực tiếp'],
  ['services', 'home', 'Quản lý dịch vụ'],
  ['blogs', 'file', 'Bài viết & Blog'],
  ['pages', 'file', 'Trang giới thiệu'],
  ['pricing', 'file', 'Bảng giá công khai'],
  ['users', 'users', 'Tài khoản'],
  ['feedback', 'report', 'Phản hồi & báo lỗi'],
  ['outbox', 'mail', 'Hàng đợi email'],
  ['settings', 'settings', 'Cấu hình hệ thống'],
];
const mailKinds = {
  order_received: 'Yêu cầu dịch vụ',
  feedback_admin: 'Phản hồi mới → Admin',
  feedback_customer: 'Kết quả xử lý → Khách hàng',
  contact_admin: 'Liên hệ mới → Admin',
};
const transitions = {
  new: ['surveying', 'confirmed', 'cancelled'],
  surveying: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: ['paid'],
  paid: [],
  cancelled: [],
};

function OrderEditor({ order, mutate, onClose }) {
  const [status, setStatus] = useState(order.status),
    [amount, setAmount] = useState(order.quote.total),
    [note, setNote] = useState(order.quote.confirmed ? order.quote.note : ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const save = async (path, body) => {
    setBusy(true);
    setError('');
    try {
      await mutate(path, 'PATCH', body);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal wide title={`Chi tiết yêu cầu · ${order.id}`} onClose={onClose}>
      <div className="editor-body">
        <div className="order-contact">
          <h3>{order.data.name}</h3>
          <p>
            {order.data.phone} · {order.data.email || 'Không có email'}
          </p>
          <p>{order.data.address}</p>
          <p>Ngày mong muốn: {order.data.preferred_date || 'Chưa chọn'}</p>
          <span className={`status ${order.status}`}>{statuses[order.status]}</span>
        </div>
        <h3>
          {order.quote.service} · {order.data.subtype}
        </h3>
        <div className="detail-grid">
          {Object.entries(order.data.details).map(([k, v]) => (
            <div key={k}>
              <small>{order.fieldLabels?.[k] || k}</small>
              <b>{String(v)}</b>
            </div>
          ))}
        </div>
        <QuoteTable quote={order.quote} />
        {order.summary && (
          <div className="info-box">
            <p>
              <b>Tóm tắt tiếp nhận</b>
              <br />
              {order.summary}
            </p>
          </div>
        )}
        <a className="button secondary small" href={`/api/orders/${order.id}/xlsx`}>
          <Icon name="download" size={16} /> Tải Excel
        </a>
        <hr />
        {!['completed', 'paid', 'cancelled'].includes(order.status) && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(`/admin/orders/${order.id}/quote`, { amount: Number(amount), note });
            }}
          >
            <h3>Xác nhận báo giá sau khảo sát</h3>
            <div className="form-grid">
              <Field
                label="Tổng giá thỏa thuận (VND, gồm thuế/phí)"
                type="number"
                required
                min={0}
                max={100000000000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Field
                label="Hạng mục và ghi chú thỏa thuận"
                required
                minLength={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <button className="button primary small" disabled={busy}>
              Lưu giá đã xác nhận
            </button>
          </form>
        )}
        <form
          className="status-form"
          onSubmit={(e) => {
            e.preventDefault();
            save(`/admin/orders/${order.id}`, { status });
          }}
        >
          <Field label="Tiến độ xử lý">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {[order.status, ...transitions[order.status]].map((s) => (
                <option key={s} value={s}>
                  {statuses[s]}
                </option>
              ))}
            </select>
          </Field>
          <button className="button primary small" disabled={busy || status === order.status}>
            Cập nhật trạng thái
          </button>
        </form>
        {status === 'paid' && (
          <p className="fine-print">
            Chỉ xác nhận thanh toán sau khi đã đối soát giao dịch thực tế.
          </p>
        )}
        <ErrorNotice error={error} />
      </div>
    </Modal>
  );
}

function ServiceEditor({ service, mutate, onClose }) {
  const [form, setForm] = useState(
    service || {
      id: '',
      name: '',
      tagline: '',
      description: '',
      icon: 'home',
      image: '/images/service-1.jpg',
      subservices: ['Dịch vụ tiêu chuẩn'],
      fields: [
        {
          key: 'quantity',
          label: 'Khối lượng',
          type: 'number',
          required: true,
          min: 1,
          max: 100000,
        },
      ],
      quantityKey: 'quantity',
      unit: 'lần',
      rate: 0,
      active: true,
    },
  );
  const [fields, setFields] = useState(JSON.stringify(form.fields, null, 2)),
    [subs, setSubs] = useState(form.subservices.join('\n')),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const input = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = {
        ...form,
        rate: Number(form.rate),
        fields: JSON.parse(fields),
        subservices: subs
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean),
      };
      await mutate(`/admin/services/${form.id}`, 'PUT', body);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal wide title={service ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ'} onClose={onClose}>
      <form className="editor-body" onSubmit={submit}>
        <div className="form-grid">
          <Field
            label="Mã dịch vụ"
            required
            pattern="[a-z0-9-]{2,80}"
            disabled={!!service}
            value={form.id}
            onChange={(e) => input('id', e.target.value)}
          />
          <Field
            label="Tên dịch vụ"
            required
            minLength={3}
            value={form.name}
            onChange={(e) => input('name', e.target.value)}
          />
          <Field
            label="Dòng giới thiệu"
            value={form.tagline}
            onChange={(e) => input('tagline', e.target.value)}
          />
          <Field
            label="Ảnh (URL hoặc /images/...)"
            value={form.image}
            onChange={(e) => input('image', e.target.value)}
          />
        </div>
        <Field label="Mô tả">
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => input('description', e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field
            label="Đơn giá tham khảo (VND)"
            type="number"
            min={0}
            max={100000000}
            required
            value={form.rate}
            onChange={(e) => input('rate', e.target.value)}
          />
          <Field
            label="Đơn vị tính"
            required
            value={form.unit}
            onChange={(e) => input('unit', e.target.value)}
          />
        </div>
        <Field label="Các dịch vụ con (mỗi dòng một loại)">
          <textarea rows={4} value={subs} onChange={(e) => setSubs(e.target.value)} required />
        </Field>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => input('active', e.target.checked)}
          />
          Hiển thị và cho phép đặt dịch vụ
        </label>
        <details className="advanced-fields">
          <summary>Cấu hình biểu mẫu riêng cho dịch vụ</summary>
          <p>
            Trường số cần có key, label, type: number, required, min và max. Trường chọn dùng type:
            select và options. Giữ các trường hệ số sessions, days, distance ở dịch vụ gốc tương
            ứng.
          </p>
          <Field
            label="Khóa trường khối lượng để tính giá"
            required
            value={form.quantityKey}
            onChange={(e) => input('quantityKey', e.target.value)}
          />
          <Field label="Danh sách trường (JSON)">
            <textarea
              className="code-input"
              rows={14}
              value={fields}
              onChange={(e) => setFields(e.target.value)}
            />
          </Field>
        </details>
        <ErrorNotice error={error} />
        <button className="button primary" disabled={busy}>
          {busy ? 'Đang lưu...' : 'Lưu dịch vụ'}
        </button>
      </form>
    </Modal>
  );
}

function BlogEditor({ blog, mutate, onClose }) {
  const [form, setForm] = useState(
    blog
      ? {
          title: blog.title,
          category: blog.category,
          excerpt: blog.excerpt,
          body: blog.body,
          image: blog.image,
          published: !!blog.published,
        }
      : {
          title: '',
          category: 'Góc chia sẻ',
          excerpt: '',
          body: '',
          image: '/images/hero.jpg',
          published: false,
        },
  );
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const input = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await mutate(`/admin/blogs/${blog?.id || crypto.randomUUID()}`, 'PUT', form);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal wide title={blog ? 'Chỉnh sửa bài viết' : 'Viết bài mới'} onClose={onClose}>
      <form className="editor-body" onSubmit={submit}>
        <Field
          label="Tiêu đề"
          required
          minLength={5}
          value={form.title}
          onChange={(e) => input('title', e.target.value)}
        />
        <div className="form-grid">
          <Field
            label="Chuyên mục"
            required
            minLength={2}
            value={form.category}
            onChange={(e) => input('category', e.target.value)}
          />
          <Field
            label="Ảnh bài viết"
            value={form.image}
            onChange={(e) => input('image', e.target.value)}
          />
        </div>
        <Field label="Tóm tắt">
          <textarea
            required
            minLength={5}
            maxLength={500}
            rows={2}
            value={form.excerpt}
            onChange={(e) => input('excerpt', e.target.value)}
          />
        </Field>
        <Field label="Nội dung (xuống dòng trống để ngắt đoạn)">
          <textarea
            required
            minLength={20}
            maxLength={20000}
            rows={12}
            value={form.body}
            onChange={(e) => input('body', e.target.value)}
          />
        </Field>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => input('published', e.target.checked)}
          />{' '}
          Xuất bản công khai
        </label>
        <ErrorNotice error={error} />
        <button className="button primary" disabled={busy}>
          {busy ? 'Đang lưu...' : 'Lưu bài viết'}
        </button>
      </form>
    </Modal>
  );
}

function FeedbackEditor({ item, mutate, onClose }) {
  const [status, setStatus] = useState(item.status),
    [reply, setReply] = useState(item.reply),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <Modal title={`Xử lý phản hồi · ${item.id}`} onClose={onClose}>
      <form
        className="editor-body"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await mutate(`/admin/feedback/${item.id}`, 'PATCH', { status, reply });
            onClose();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="status">
          {item.data.category}
          {item.data.rating > 0 ? ` · ${item.data.rating}/5 sao` : ''}
        </span>
        <h3>{item.data.subject}</h3>
        <p>{item.data.content}</p>
        <p>
          {item.data.name} · {item.data.phone}
          <br />
          {item.data.email}
        </p>
        <p>
          Mã yêu cầu: {item.data.order_id || 'Không có'}
          <br />
          Giao dịch: {item.data.transaction || 'Không có'}
        </p>
        <Field label="Trạng thái">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {['new', 'processing', 'resolved'].map((s) => (
              <option value={s} key={s}>
                {statuses[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Phản hồi gửi đến khách hàng và qua email">
          <textarea
            rows={5}
            required={status === 'resolved'}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
        </Field>
        <p className="muted">
          Khi trạng thái hoặc nội dung thay đổi, hệ thống sẽ gửi email đến {item.data.email}.
        </p>
        <ErrorNotice error={error} />
        <button className="button primary" disabled={busy}>
          Lưu và gửi email
        </button>
      </form>
    </Modal>
  );
}

function Settings({ data, mutate }) {
  const [form, setForm] = useState(data),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const input = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const field = (key, label, type = 'text') => (
    <Field
      key={key}
      label={label}
      type={type}
      value={form[key] ?? ''}
      min={type === 'number' ? 0 : undefined}
      max={key === 'tax_percent' ? 100 : undefined}
      onChange={(e) => input(key, type === 'number' ? Number(e.target.value) : e.target.value)}
    />
  );
  return (
    <form
      className="admin-panel settings-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await mutate('/admin/settings', 'PUT', form);
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Thông tin công ty</h3>
      <div className="form-grid">
        {field('company_name', 'Tên công ty')}
        {field('hotline', 'Hotline')}
        {field('email', 'Email Admin nhận yêu cầu', 'email')}
        {field('address', 'Địa chỉ / khu vực phục vụ')}
        {field('legal_name', 'Tên pháp lý công ty')}
        {field('tax_code', 'Mã số thuế')}
        {field('landline', 'Điện thoại văn phòng')}
        {field('working_hours', 'Giờ làm việc')}
        {field('map_url', 'Đường dẫn Google Maps', 'url')}
      </div>
      <h3>Nội dung trang chủ</h3>
      <Field label="Tiêu đề chính (mỗi dòng là một dòng hiển thị)">
        <textarea
          rows={2}
          value={form.hero_title}
          onChange={(e) => input('hero_title', e.target.value)}
        />
      </Field>
      <Field label="Giới thiệu">
        <textarea
          rows={3}
          value={form.hero_description}
          onChange={(e) => input('hero_description', e.target.value)}
        />
      </Field>
      <h3>Báo giá & thanh toán</h3>
      <div className="form-grid">
        {field('tax_percent', 'Thuế áp dụng trong chiết tính (%)', 'number')}
        {field('moving_km_rate', 'Đơn giá vận chuyển tham khảo (VND/km)', 'number')}
      </div>
      <Field label="Ghi chú báo giá">
        <textarea
          rows={3}
          value={form.quote_note}
          onChange={(e) => input('quote_note', e.target.value)}
        />
      </Field>
      <div className="form-grid">
        {field('bank_name', 'Tên ngân hàng')}
        {field('bank_account', 'Số tài khoản')}
        {field('bank_owner', 'Tên chủ tài khoản')}
        {field('qr_image', 'Ảnh QR (URL HTTPS hoặc /images/...)')}
      </div>
      <div className="info-box">
        <Icon name="qr" />
        <p>
          QR chỉ hiển thị với đơn đã hoàn thành và có giá xác nhận. Dùng QR do ngân hàng cung cấp.
          Khách ghi mã yêu cầu khi chuyển khoản; Admin đối soát trước khi đánh dấu đã thanh toán.
        </p>
      </div>
      <ErrorNotice error={error} />
      <button className="button primary" disabled={busy}>
        {busy ? 'Đang lưu...' : 'Lưu cấu hình'}
      </button>
    </form>
  );
}

export default function Admin({ user, logout, onUpdate }) {
  const [tab, setTab] = useState('overview'),
    [data, setData] = useState(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [online, setOnline] = useState(false),
    [edit, setEdit] = useState(null),
    [search, setSearch] = useState(''),
    [statusFilter, setStatusFilter] = useState('all'),
    [selectedChat, setSelectedChat] = useState(null),
    [reply, setReply] = useState(''),
    [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const chat = data?.chats.find((c) => c.id === selectedChat);
  useEffect(() => {
    if (tab === 'chat' && chat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tab, selectedChat, chat?.messages?.length]);
  const load = useCallback(async () => {
    try {
      setData(await api('/admin/dashboard'));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);
  useEffect(() => {
    const beat = () =>
      api('/admin/presence', { method: 'POST', body: { online } }).catch((e) =>
        setError(e.message),
      );
    beat();
    const id = setInterval(beat, 20000);
    return () => clearInterval(id);
  }, [online]);
  useEffect(
    () => () => {
      api('/admin/presence', { method: 'POST', body: { online: false }, keepalive: true }).catch(
        () => {},
      );
    },
    [],
  );
  useEffect(() => {
    if (notice) {
      const id = setTimeout(() => setNotice(''), 5000);
      return () => clearTimeout(id);
    }
  }, [notice]);
  const closeEdit = useCallback(() => setEdit(null), []);
  const mutate = async (path, method, body) => {
    const result = await api(path, { method, body });
    await load();
    onUpdate();
    setNotice('Đã lưu thay đổi.');
    return result;
  };
  const action = async (path, method, body) => {
    try {
      await mutate(path, method, body);
    } catch (e) {
      setError(e.message);
    }
  };
  const orders =
    data?.orders.filter(
      (o) =>
        (statusFilter === 'all' || o.status === statusFilter) &&
        `${o.id} ${o.data.name} ${o.data.phone} ${o.quote.service}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];
  const editOrder = (o) =>
    setEdit({
      type: 'order',
      value: {
        ...o,
        fieldLabels: Object.fromEntries(
          (data.services.find((s) => s.id === o.data.service_id)?.fields || []).map((f) => [
            f.key,
            f.label,
          ]),
        ),
      },
    });
  const orderTable = (list) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th>Dịch vụ</th>
            <th>Chiết tính</th>
            <th>Trạng thái</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((o) => (
            <tr key={o.id}>
              <td>
                <b>{o.data.name}</b>
                <small>{o.data.phone}</small>
              </td>
              <td>
                {o.quote.service}
                <small>
                  {o.data.mode === 'survey' ? 'Khảo sát tận nơi' : 'Báo giá trực tuyến'}
                </small>
              </td>
              <td>
                {o.quote.survey ? 'Chờ khảo sát' : money(o.quote.total)}
                <small>{date(o.created)}</small>
              </td>
              <td>
                <span className={`status ${o.status}`}>{statuses[o.status]}</span>
              </td>
              <td>
                <button className="text-button" onClick={() => editOrder(o)}>
                  Chi tiết <Icon name="chevron" size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!list.length && (
        <Empty
          title="Chưa có yêu cầu phù hợp"
          text="Các yêu cầu của khách hàng sẽ xuất hiện tại đây."
        />
      )}
    </div>
  );
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Logo light />
        <span className="admin-label">TRUNG TÂM QUẢN TRỊ</span>
        <nav>
          {tabs.map(([id, icon, label]) => (
            <button
              className={tab === id ? 'active' : ''}
              key={id}
              onClick={() => {
                setTab(id);
                setSearch('');
                setStatusFilter('all');
              }}
            >
              <Icon name={icon} size={19} />
              {label}
              {id === 'feedback' && !!data?.feedback.filter((f) => f.status === 'new').length && (
                <i>{data.feedback.filter((f) => f.status === 'new').length}</i>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="#">
            <Icon name="home" size={18} /> Xem website
          </a>
          <button onClick={logout}>
            <Icon name="logout" size={18} /> Đăng xuất
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <span className="eyebrow">ĐẤT PHƯƠNG NAM</span>
            <h1>{tabs.find((t) => t[0] === tab)?.[2]}</h1>
          </div>
          <div className="admin-profile">
            <button
              className={`presence-toggle ${online ? 'online' : ''}`}
              onClick={() => setOnline(!online)}
            >
              <i />
              {online ? 'Đang nhận tư vấn' : 'Đang ngoại tuyến'}
            </button>
            <span className="admin-avatar">{user.name[0]}</span>
          </div>
        </header>
        <div className="admin-content">
          <ErrorNotice error={error} />
          {notice && (
            <div className="success-notice" role="status">
              <Icon name="check" />
              {notice}
            </div>
          )}
          {!data ? (
            <Empty
              title="Đang tải dữ liệu quản trị..."
              text="Kết nối đến hệ thống chăm sóc khách hàng."
            />
          ) : (
            <>
              {tab === 'overview' && (
                <>
                  <div className="dashboard-welcome">
                    <div>
                      <h2>Một ngày làm việc thật tốt, bạn nhé.</h2>
                      <p>Mọi yêu cầu và trải nghiệm khách hàng, trong một không gian.</p>
                    </div>
                    <Icon name="sparkles" size={45} />
                  </div>
                  <div className="stat-grid">
                    {[
                      ['Tổng yêu cầu', data.orders.length, 'file'],
                      [
                        'Cần xử lý',
                        data.orders.filter((o) => ['new', 'surveying'].includes(o.status)).length,
                        'clock',
                      ],
                      [
                        'Hội thoại trực tiếp',
                        data.chats.filter((c) => c.mode === 'human').length,
                        'chat',
                      ],
                      [
                        'Phản hồi mới',
                        data.feedback.filter((f) => f.status === 'new').length,
                        'report',
                      ],
                    ].map(([label, value, icon]) => (
                      <article key={label}>
                        <span>
                          <Icon name={icon} />
                        </span>
                        <small>{label}</small>
                        <strong>{value}</strong>
                      </article>
                    ))}
                  </div>
                  <div className="admin-panel">
                    <div className="panel-heading">
                      <h3>Yêu cầu gần đây</h3>
                      <button className="text-button" onClick={() => setTab('orders')}>
                        Xem tất cả <Icon name="arrow" size={16} />
                      </button>
                    </div>
                    {orderTable(data.orders.slice(0, 6))}
                  </div>
                  <div className="integration-grid">
                    <div className="admin-panel">
                      <h3>
                        <Icon name="chat" /> Trợ lý Nở
                      </h3>
                      <p>
                        {data.integrations.ai
                          ? 'Đã có cấu hình AI. Hãy kiểm tra bằng một hội thoại thực tế.'
                          : 'Đang dùng tư vấn cơ bản. Cấu hình PROJECT_ID, LOCATION và VERTEX_MODEL_NAME trong backend/.env để bật AI.'}
                      </p>
                    </div>
                    <div className="admin-panel">
                      <h3>
                        <Icon name="mail" /> Email báo giá
                      </h3>
                      <p>
                        {data.integrations.smtp
                          ? 'Đã có cấu hình SMTP. Trạng thái gửi từng email được lưu trong hàng đợi.'
                          : 'Chưa cấu hình SMTP. Yêu cầu và Excel vẫn được lưu; email chờ cấu hình và gửi lại.'}
                      </p>
                      <button className="text-button" onClick={() => setTab('outbox')}>
                        Xem hàng đợi email
                      </button>
                    </div>
                  </div>
                </>
              )}
              {tab === 'orders' && (
                <div className="admin-panel">
                  <div className="table-toolbar">
                    <div className="search-field">
                      <Icon name="search" />
                      <input
                        aria-label="Tìm yêu cầu"
                        placeholder="Tên khách, số điện thoại, mã yêu cầu..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label="Lọc trạng thái"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">Tất cả trạng thái</option>
                      {Object.keys(transitions).map((s) => (
                        <option key={s} value={s}>
                          {statuses[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {orderTable(orders)}
                </div>
              )}
              {tab === 'chat' && (
                <>
                  <div className="info-box">
                    <Icon name="chat" />
                    <p>
                      {online
                        ? 'Bạn đang nhận tư vấn. Hội thoại được cập nhật tự động mỗi 5 giây.'
                        : 'Bật “Đang ngoại tuyến” ở góc trên để nhận khách tư vấn trực tiếp. Nở đang hỗ trợ khách trong lúc bạn ngoại tuyến.'}
                    </p>
                  </div>
                  <div className="admin-chat">
                    <aside>
                      {data.chats
                        .filter((c) => c.messages.length)
                        .map((c) => (
                          <button
                            className={selectedChat === c.id ? 'selected' : ''}
                            key={c.id}
                            onClick={() => setSelectedChat(c.id)}
                          >
                            <span className="chat-list-avatar">
                              <Icon name="user" />
                            </span>
                            <span>
                              <b>
                                {data.users.find((u) => u.id === c.owner)?.name ||
                                  `Khách ${c.id.slice(-5)}`}
                              </b>
                              <small>{c.messages.at(-1)?.content}</small>
                              <i>{c.mode === 'human' ? 'Tư vấn trực tiếp' : 'Nở đang hỗ trợ'}</i>
                            </span>
                          </button>
                        ))}
                      {!data.chats.some((c) => c.messages.length) && (
                        <Empty
                          title="Chưa có hội thoại"
                          text="Tin nhắn khách gửi sẽ xuất hiện ở đây."
                        />
                      )}
                    </aside>
                    <section>
                      {chat ? (
                        <>
                          <header>
                            <h3>Hội thoại #{chat.id.slice(-5)}</h3>
                          </header>
                          <div className="admin-messages">
                            {chat.messages.map((m) => (
                              <div
                                className={`message ${m.role === 'user' ? 'assistant' : 'user'}`}
                                key={m.id}
                              >
                                <small>
                                  {m.role === 'user'
                                    ? 'Khách hàng'
                                    : m.role === 'admin'
                                      ? 'Nhân viên'
                                      : 'Nở'}
                                </small>
                                {m.content}
                              </div>
                            ))}
                            <div ref={messagesEndRef} />
                          </div>
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              setSending(true);
                              try {
                                await mutate(`/admin/chats/${chat.id}/reply`, 'POST', {
                                  content: reply,
                                });
                                setReply('');
                              } catch (e) {
                                setError(e.message);
                              } finally {
                                setSending(false);
                              }
                            }}
                          >
                            <input
                              required
                              maxLength={5000}
                              aria-label="Trả lời khách hàng"
                              placeholder="Nhập lời tư vấn cho khách..."
                              value={reply}
                              onChange={(e) => setReply(e.target.value)}
                            />
                            <button
                              className="button primary small"
                              disabled={sending || !reply.trim()}
                            >
                              <Icon name="send" /> Gửi
                            </button>
                          </form>
                        </>
                      ) : (
                        <Empty
                          icon="chat"
                          title="Sẵn sàng lắng nghe"
                          text="Chọn một hội thoại để xem và trả lời khách hàng."
                        />
                      )}
                    </section>
                  </div>
                </>
              )}
              {tab === 'services' && (
                <>
                  <div className="panel-heading">
                    <p>Quản lý danh mục, đơn giá và biểu mẫu theo từng dịch vụ.</p>
                    <button
                      className="button primary small"
                      onClick={() => setEdit({ type: 'service', value: null })}
                    >
                      <Icon name="plus" />
                      Thêm dịch vụ
                    </button>
                  </div>
                  <div className="admin-service-grid">
                    {data.services.map((s) => (
                      <article className="admin-panel" key={s.id}>
                        <img src={s.image} alt={s.name} />
                        <span className="status">{s.active ? 'Đang hiển thị' : 'Đã ẩn'}</span>
                        <h3>{s.name}</h3>
                        <p>
                          {s.subservices.length} loại dịch vụ · {s.fields.length} trường thông tin
                        </p>
                        <b>
                          {money(s.rate)} / {s.unit}
                        </b>
                        <button
                          className="button secondary small"
                          onClick={() => setEdit({ type: 'service', value: s })}
                        >
                          Chỉnh sửa dịch vụ
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              )}
              {tab === 'blogs' && (
                <>
                  <div className="panel-heading">
                    <p>Xuất bản nội dung hữu ích dành cho khách hàng.</p>
                    <button
                      className="button primary small"
                      onClick={() => setEdit({ type: 'blog', value: null })}
                    >
                      <Icon name="plus" />
                      Viết bài mới
                    </button>
                  </div>
                  <div className="admin-panel">
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Bài viết</th>
                            <th>Chuyên mục</th>
                            <th>Hiển thị</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.blogs.map((b) => (
                            <tr key={b.id}>
                              <td>
                                <b>{b.title}</b>
                              </td>
                              <td>{b.category}</td>
                              <td>
                                <span className="status">
                                  {b.published ? 'Đã xuất bản' : 'Bản nháp'}
                                </span>
                              </td>
                              <td>
                                <div className="button-row">
                                  <button
                                    className="text-button"
                                    onClick={() => setEdit({ type: 'blog', value: b })}
                                  >
                                    Chỉnh sửa
                                  </button>
                                  <button
                                    className="text-button danger"
                                    onClick={() => setEdit({ type: 'deleteBlog', value: b })}
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
              {tab === 'users' && (
                <div className="admin-panel">
                  <h3>Tài khoản khách hàng & quản trị</h3>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Họ tên</th>
                          <th>Email</th>
                          <th>Vai trò</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.users.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <b>{u.name}</b>
                            </td>
                            <td>{u.email}</td>
                            <td>
                              <select
                                aria-label={`Vai trò ${u.email}`}
                                disabled={u.id === user.id}
                                value={u.role}
                                onChange={(e) =>
                                  action(`/admin/users/${u.id}`, 'PATCH', {
                                    role: e.target.value,
                                    active: !!u.active,
                                  })
                                }
                              >
                                <option value="customer">Khách hàng</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td>
                              <button
                                disabled={u.id === user.id}
                                className={`status ${u.active ? 'completed' : 'cancelled'}`}
                                onClick={() =>
                                  action(`/admin/users/${u.id}`, 'PATCH', {
                                    role: u.role,
                                    active: !u.active,
                                  })
                                }
                              >
                                {u.active ? 'Đang hoạt động · Khóa' : 'Đã khóa · Mở lại'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {tab === 'feedback' && (
                <div className="admin-panel">
                  <h3>Tiếp nhận & xử lý phản hồi</h3>
                  {data.feedback.length ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Khách hàng</th>
                            <th>Vấn đề</th>
                            <th>Trạng thái</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {data.feedback.map((f) => (
                            <tr key={f.id}>
                              <td>
                                <b>{f.data.name}</b>
                                <small>{f.data.phone}</small>
                              </td>
                              <td>
                                {f.data.subject}
                                <small>
                                  {f.data.category}
                                  {f.data.rating > 0 ? ` · ${f.data.rating}/5 sao` : ''}
                                </small>
                              </td>
                              <td>
                                <span className={`status ${f.status}`}>{statuses[f.status]}</span>
                              </td>
                              <td>
                                <button
                                  className="text-button"
                                  onClick={() => setEdit({ type: 'feedback', value: f })}
                                >
                                  Xử lý <Icon name="arrow" size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      icon="heart"
                      title="Chưa có phản hồi"
                      text="Góp ý và báo lỗi về dịch vụ, thanh toán sẽ được lưu tại đây."
                    />
                  )}
                </div>
              )}
              {tab === 'outbox' && (
                <div className="admin-panel">
                  <h3>Email yêu cầu và phản hồi</h3>
                  <p className="muted">
                    Email yêu cầu dịch vụ có file Excel đính kèm; email phản hồi thông báo hai chiều
                    giữa khách hàng và Admin. Chỉ trạng thái “Đã gửi” xác nhận SMTP đã chấp nhận.
                  </p>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Người nhận</th>
                          <th>Loại / tham chiếu</th>
                          <th>Trạng thái</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {data.outbox.map((m) => (
                          <tr key={m.id}>
                            <td>{m.recipient}</td>
                            <td>
                              <small>{mailKinds[m.kind] || 'Email hệ thống'}</small>
                              <small>{m.reference_id || m.order_id}</small>
                            </td>
                            <td>
                              <span className={`status ${m.status}`}>{statuses[m.status]}</span>
                              {m.error && <small>{m.error}</small>}
                            </td>
                            <td>
                              {['pending', 'failed'].includes(m.status) && (
                                <button
                                  className="text-button"
                                  onClick={() => action(`/admin/outbox/${m.id}/retry`, 'POST')}
                                >
                                  Gửi lại
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!data.outbox.length && (
                      <Empty
                        icon="mail"
                        title="Hàng đợi đang trống"
                        text="Email sẽ được tạo khi có yêu cầu dịch vụ hoặc phản hồi mới."
                      />
                    )}
                  </div>
                </div>
              )}
              {tab === 'settings' && <Settings data={data.settings} mutate={mutate} />}
              {tab === 'pages' && (
                <ContentPanel
                  pages={data.pages || []}
                  onEdit={(p) => setEdit({ type: 'page', value: p })}
                />
              )}
              {tab === 'pricing' && (
                <PricingPanel
                  items={data.pricing || []}
                  onEdit={(p) => setEdit({ type: 'price', value: p })}
                />
              )}
            </>
          )}
        </div>
      </div>
      {edit?.type === 'order' && (
        <OrderEditor order={edit.value} mutate={mutate} onClose={closeEdit} />
      )}
      {edit?.type === 'page' && (
        <PageEditor page={edit.value} mutate={mutate} onClose={closeEdit} />
      )}
      {edit?.type === 'price' && (
        <PriceEditor
          item={edit.value}
          services={data.services}
          mutate={mutate}
          onClose={closeEdit}
        />
      )}
      {edit?.type === 'service' && (
        <ServiceEditor service={edit.value} mutate={mutate} onClose={closeEdit} />
      )}
      {edit?.type === 'blog' && (
        <BlogEditor blog={edit.value} mutate={mutate} onClose={closeEdit} />
      )}
      {edit?.type === 'feedback' && (
        <FeedbackEditor item={edit.value} mutate={mutate} onClose={closeEdit} />
      )}
      {edit?.type === 'deleteBlog' && (
        <Modal title="Xóa bài viết" onClose={closeEdit}>
          <div className="editor-body">
            <p>Bạn muốn xóa bài viết “{edit.value.title}”?</p>
            <button
              className="button primary"
              onClick={async () => {
                try {
                  await mutate(`/admin/blogs/${edit.value.id}`, 'DELETE');
                  closeEdit();
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Xóa bài viết
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
