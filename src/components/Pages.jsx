import { useState } from 'react';
import company from '../data/company.json';
import { api, money } from '../lib/api';
import { Empty, ErrorNotice, Field, Icon } from './ui';
import './Pages.css';

export const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
export const pageHref = (id) => `#/${id}`;
export const blogHref = (id) => `#/bai-viet/${encodeURIComponent(id)}`;
export const categoryHref = (category) => `#/tin-tuc?chuyen-muc=${encodeURIComponent(category)}`;
export const sortedPages = (pages) =>
  [...pages].sort(
    (a, b) =>
      company.pages.findIndex((p) => p.id === a.id) - company.pages.findIndex((p) => p.id === b.id),
  );
const shortDate = (n) => new Date(n * 1000).toLocaleDateString('vi-VN');

export function PageBanner({ title, parent }) {
  return (
    <section className="page-banner">
      <div className="container">
        <h1>{title}</h1>
        <nav aria-label="Đường dẫn trang">
          <a href="#">Trang chủ</a>
          <span>/</span>
          {parent && (
            <>
              <a href={parent.href}>{parent.title}</a>
              <span>/</span>
            </>
          )}
          <span aria-current="page">{title}</span>
        </nav>
      </div>
    </section>
  );
}

function Sidebar({ pages, active, openChat, settings }) {
  return (
    <aside className="page-sidebar">
      <nav className="page-directory" aria-label="Danh mục trang">
        <h2>Danh mục trang</h2>
        {sortedPages(pages).map((p) => (
          <a aria-current={active === p.id ? 'page' : undefined} key={p.id} href={pageHref(p.id)}>
            {p.nav_title}
            <Icon name="chevron" size={14} />
          </a>
        ))}
        <a href="#/bang-gia">
          Bảng giá dịch vụ
          <Icon name="chevron" size={14} />
        </a>
        <a href="#/lien-he">
          Liên hệ
          <Icon name="chevron" size={14} />
        </a>
      </nav>
      <div className="sidebar-help">
        <Icon name="chat" size={32} />
        <h3>Chúng tôi luôn sẵn sàng lắng nghe</h3>
        <p>Trao đổi nhu cầu cùng Nở hoặc nhân viên tư vấn.</p>
        <button className="button yellow" onClick={openChat}>
          Bắt đầu trò chuyện
        </button>
        <a href={`tel:${settings.hotline.replaceAll(' ', '')}`}>{settings.hotline}</a>
      </div>
    </aside>
  );
}

export function TextBody({ body, headings = false }) {
  return (
    <div className="page-prose">
      {body
        .split('\n\n')
        .filter(Boolean)
        .map((p, i) => {
          if (/^Nguồn: https:\/\//.test(p))
            return (
              <p className="article-source" key={i}>
                <a href={p.slice(7).trim()} target="_blank" rel="noreferrer">
                  Đọc bài gốc trên website công ty <Icon name="arrow" size={14} />
                </a>
              </p>
            );
          return headings && p.length < 95 && !p.includes('\n') ? (
            <h2 key={i}>{p}</h2>
          ) : (
            <p key={i}>{p}</p>
          );
        })}
    </div>
  );
}

export function CompanyPage({ page, data, openBooking, openChat }) {
  return (
    <main>
      <PageBanner title={page.title} />
      <div className="container page-layout">
        <Sidebar pages={data.pages} active={page.id} openChat={openChat} settings={data.settings} />
        <article className="company-article">
          <span className="eyebrow">OSHIN THỜI ĐẠI · ĐẤT PHƯƠNG NAM</span>
          <h2>{page.title}</h2>
          <p className="page-lead">{page.excerpt}</p>
          {page.highlights && (
            <div className="about-highlights">
              {page.highlights.map((h, i) => (
                <div key={i} className="about-highlight-card">
                  <Icon name={h.icon} size={28} />
                  <strong>{h.title}</strong>
                  <span>{h.desc}</span>
                </div>
              ))}
            </div>
          )}
          <img className="company-page-image" src={page.image} alt={page.title} />
          <TextBody body={page.body} headings />
          <div className="page-service-links">
            <h2>Lĩnh vực hoạt động</h2>
            {data.services.map((s) => (
              <button key={s.id} onClick={() => openBooking(s.id)}>
                <Icon name={s.icon} />
                <span>{s.name}</span>
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
          <div className="page-cta">
            <h3>Bạn cần một phương án phù hợp?</h3>
            <p>Gửi nhu cầu để đội ngũ liên hệ, khảo sát và lập báo giá.</p>
            <button className="button yellow" onClick={() => openBooking(undefined, 'survey')}>
              Hẹn khảo sát <Icon name="arrow" size={17} />
            </button>
          </div>
          {page.source_url && (
            <p className="article-source">
              Thông tin biên tập từ{' '}
              <a href={page.source_url} target="_blank" rel="noreferrer">
                website chính thức của công ty
              </a>
              .
            </p>
          )}
        </article>
      </div>
    </main>
  );
}

export function HistoryPage({ page, data, openBooking, openChat }) {
  const sections = page.sections || [];
  const journey = sections.find((s) => s.id === 'journey');
  const ecosystem = sections.find((s) => s.id === 'ecosystem');
  const partner = sections.find((s) => s.id === 'partner');
  const community = sections.find((s) => s.id === 'community');

  return (
    <main>
      <PageBanner title={page.title} />
      <div className="container page-layout">
        <Sidebar pages={data.pages} active={page.id} openChat={openChat} settings={data.settings} />
        <article className="company-article history-article">
          <span className="eyebrow">OSHIN THỜI ĐẠI · ĐẤT PHƯƠNG NAM</span>
          <h2>{page.title}</h2>
          <p className="page-lead">{page.excerpt}</p>

          {/* Section I: Hành trình 20 năm */}
          {journey && (
            <section className="history-section">
              <h3 className="history-section-title">
                <span className="history-section-label">{journey.label}</span>
                {journey.title}
              </h3>
              {journey.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
              {journey.image && (
                <img
                  className="history-section-image"
                  src={journey.image}
                  alt={journey.title}
                  loading="lazy"
                />
              )}
            </section>
          )}

          {/* Section II: Hệ sinh thái dịch vụ */}
          {ecosystem && (
            <section className="history-section">
              <h3 className="history-section-title">
                <span className="history-section-label">{ecosystem.label}</span>
                {ecosystem.title}
              </h3>
              {ecosystem.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
              {ecosystem.services && (
                <ul className="history-service-list">
                  {ecosystem.services.map((s, i) => (
                    <li key={i}>
                      <Icon name="check" size={16} />
                      <span>
                        <strong>{s.name}:</strong> {s.desc}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Section III: Đối tác đáng tin cậy */}
          {partner && (
            <section className="history-section">
              <h3 className="history-section-title">
                <span className="history-section-label">{partner.label}</span>
                {partner.title}
              </h3>
              {partner.image && (
                <img
                  className="history-section-image"
                  src={partner.image}
                  alt={partner.title}
                  loading="lazy"
                />
              )}
              {partner.points && (
                <div className="history-points">
                  {partner.points.map((pt, i) => (
                    <div key={i} className="history-point">
                      <span className="history-point-num">{pt.num}</span>
                      <div>
                        <h4>{pt.title}</h4>
                        <p>{pt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Section IV: Giá trị cộng đồng */}
          {community && (
            <section className="history-section history-community">
              <h3 className="history-section-title">
                <span className="history-section-label">{community.label}</span>
                {community.title}
              </h3>
              {community.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
              {community.stats && (
                <div className="history-stats">
                  {community.stats.map((st, i) => (
                    <div key={i} className="history-stat">
                      <strong>{st.value}</strong>
                      <span>{st.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {community.quote && (
                <blockquote className="history-quote">
                  <Icon name="chat" size={22} />
                  <p>{community.quote}</p>
                </blockquote>
              )}
              <p className="history-tagline">
                Đất Phương Nam – Tiên phong, chuyên nghiệp, kiến tạo chuẩn mực vệ sinh công nghiệp
                miền Tây.
              </p>
            </section>
          )}

          <div className="page-cta">
            <h3>Bạn cần một phương án phù hợp?</h3>
            <p>Gửi nhu cầu để đội ngũ liên hệ, khảo sát và lập báo giá.</p>
            <button className="button yellow" onClick={() => openBooking(undefined, 'survey')}>
              Hẹn khảo sát <Icon name="arrow" size={17} />
            </button>
          </div>
          {page.source_url && (
            <p className="article-source">
              Thông tin biên tập từ{' '}
              <a href={page.source_url} target="_blank" rel="noreferrer">
                website chính thức của công ty
              </a>
              .
            </p>
          )}
        </article>
      </div>
    </main>
  );
}

export function VisionPage({ page, data, openBooking, openChat }) {
  const sections = page.sections || [];
  const vision = sections.find((s) => s.id === 'vision');
  const mission = sections.find((s) => s.id === 'mission');
  const values = sections.find((s) => s.id === 'values');

  return (
    <main>
      <PageBanner title={page.title} />
      <div className="container page-layout">
        <Sidebar pages={data.pages} active={page.id} openChat={openChat} settings={data.settings} />
        <article className="company-article history-article">
          <span className="eyebrow">OSHIN THỜI ĐẠI · ĐẤT PHƯƠNG NAM</span>
          <h2>{page.title}</h2>
          <p className="page-lead">{page.excerpt}</p>

          {vision && (
            <section className="history-section">
              <h3 className="history-section-title">
                <span className="history-section-label">{vision.label}</span>
                {vision.title}
              </h3>
              {vision.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
              {vision.image && (
                <img className="history-section-image" src={vision.image} alt={vision.title} loading="lazy" />
              )}
            </section>
          )}

          {mission && (
            <section className="history-section">
              <h3 className="history-section-title">
                <span className="history-section-label">{mission.label}</span>
                {mission.title}
              </h3>
              {mission.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
              {mission.services && (
                <ul className="history-service-list">
                  {mission.services.map((s, i) => (
                    <li key={i}>
                      <Icon name="check" size={16} />
                      <span><strong>{s.name}:</strong> {s.desc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {values && (
            <section className="history-section">
              <h3 className="history-section-title">
                <span className="history-section-label">{values.label}</span>
                {values.title}
              </h3>
              {values.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
              {values.points && (
                <div className="history-points">
                  {values.points.map((pt, i) => (
                    <div key={i} className="history-point">
                      <span className="history-point-num">{pt.num}</span>
                      <div>
                        <h4>{pt.title}</h4>
                        <p>{pt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="page-cta">
            <h3>Bạn cần một phương án phù hợp?</h3>
            <p>Gửi nhu cầu để đội ngũ liên hệ, khảo sát và lập báo giá.</p>
            <button className="button yellow" onClick={() => openBooking(undefined, 'survey')}>
              Hẹn khảo sát <Icon name="arrow" size={17} />
            </button>
          </div>
          {page.source_url && (
            <p className="article-source">
              Thông tin biên tập từ{' '}
              <a href={page.source_url} target="_blank" rel="noreferrer">
                website chính thức của công ty
              </a>.
            </p>
          )}
        </article>
      </div>
    </main>
  );
}

export function JourneyPage({ page, data, openBooking, openChat }) {
  const timeline = page.timeline || [];

  return (
    <main>
      <PageBanner title={page.title} />
      <div className="container page-layout">
        <Sidebar pages={data.pages} active={page.id} openChat={openChat} settings={data.settings} />
        <article className="company-article history-article">
          <span className="eyebrow">OSHIN THỜI ĐẠI · ĐẤT PHƯƠNG NAM</span>
          <h2>{page.title}</h2>
          <p className="page-lead">{page.excerpt}</p>

          {timeline.length > 0 && (
            <div className="journey-timeline">
              {timeline.map((item, i) => (
                <div key={i} className={`journey-item ${item.milestone ? 'is-milestone' : ''}`}>
                  <div className="journey-year">{item.year}</div>
                  <div className="journey-connector">
                    <div className="journey-dot" />
                    {i < timeline.length - 1 && <div className="journey-line" />}
                  </div>
                  <div className="journey-content">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="page-cta">
            <h3>Cùng chúng tôi viết tiếp hành trình?</h3>
            <p>Liên hệ để hợp tác, đặt dịch vụ hoặc gia nhập đội ngũ Đất Phương Nam.</p>
            <div className="button-row">
              <button className="button yellow" onClick={() => openBooking(undefined, 'survey')}>
                Hẹn khảo sát <Icon name="arrow" size={17} />
              </button>
            </div>
          </div>
          {page.source_url && (
            <p className="article-source">
              Thông tin biên tập từ{' '}
              <a href={page.source_url} target="_blank" rel="noreferrer">
                website chính thức của công ty
              </a>.
            </p>
          )}
        </article>
      </div>
    </main>
  );
}


export function ContactPage({ settings, user, openChat, openBooking }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: '',
    email: user?.email || '',
    subject: '',
    content: '',
    consent: false,
  });
  const [requestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState(null);
  const input = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setResult(
        await api('/contact', { method: 'POST', body: { ...form, request_id: requestId } }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const address = settings.address;
  return (
    <main>
      <PageBanner title="Liên hệ" />
      <div className="container contact-page">
        <section className="contact-form-card">
          <span className="eyebrow">KẾT NỐI CÙNG ĐẤT PHƯƠNG NAM</span>
          <h2>Gửi thắc mắc cho chúng tôi</h2>
          <p>Để lại lời nhắn, đội ngũ sẽ liên hệ theo thông tin bạn cung cấp.</p>
          {result ? (
            <div className="contact-success" role="status">
              <Icon name="check" size={40} />
              <h3>Đã tiếp nhận lời nhắn</h3>
              <p>
                Mã liên hệ: <b>{result.id}</b>
              </p>
              <p>
                Bạn có thể theo dõi phản hồi tại “Yêu cầu của tôi”. Nhân viên sẽ kiểm tra và trả lời
                qua thông tin liên hệ đã cung cấp.
              </p>
              <a href="#account" className="button primary">
                Theo dõi phản hồi
              </a>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="form-grid">
                <Field
                  label="Họ và tên"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => input('name', e.target.value)}
                />
                <Field
                  label="Số điện thoại"
                  required
                  type="tel"
                  pattern="(\+84|0)[0-9 .\-]{8,13}"
                  maxLength={20}
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => input('phone', e.target.value)}
                />
              </div>
              <Field
                label="Email nhận phản hồi"
                type="email"
                required
                maxLength={200}
                autoComplete="email"
                value={form.email}
                onChange={(e) => input('email', e.target.value)}
              />
              <Field
                label="Chủ đề cần hỗ trợ"
                required
                minLength={5}
                maxLength={200}
                value={form.subject}
                onChange={(e) => input('subject', e.target.value)}
              />
              <Field label="Nội dung lời nhắn" required>
                <textarea
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={5}
                  value={form.content}
                  onChange={(e) => input('content', e.target.value)}
                  placeholder="Mô tả nhu cầu, khu vực và thời gian bạn muốn được hỗ trợ..."
                />
              </Field>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  required
                  checked={form.consent}
                  onChange={(e) => input('consent', e.target.checked)}
                />
                <span>
                  Tôi đồng ý để công ty sử dụng thông tin này để liên hệ và xử lý yêu cầu.
                </span>
              </label>
              <ErrorNotice error={error} />
              <button className="button primary" disabled={busy}>
                {busy ? 'Đang gửi...' : 'Gửi cho chúng tôi'}
                <Icon name="send" size={17} />
              </button>
            </form>
          )}
        </section>
        <aside className="contact-info-card">
          <h2>Thông tin liên hệ</h2>
          <dl>
            <dt>Công ty</dt>
            <dd>{settings.legal_name || settings.company_name}</dd>
            <dt>Mã số thuế</dt>
            <dd>{settings.tax_code}</dd>
            <dt>
              <Icon name="pin" size={18} /> Văn phòng
            </dt>
            <dd>{address}</dd>
            <dt>
              <Icon name="phone" size={18} /> Điện thoại
            </dt>
            <dd>
              <a href={`tel:${settings.hotline.replaceAll(' ', '')}`}>{settings.hotline}</a>
              {settings.landline && (
                <>
                  <br />
                  <a href={`tel:${settings.landline.replaceAll(' ', '')}`}>{settings.landline}</a>
                </>
              )}
            </dd>
            <dt>
              <Icon name="mail" size={18} /> Email
            </dt>
            <dd>
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
            </dd>
            <dt>
              <Icon name="clock" size={18} /> Thời gian làm việc
            </dt>
            <dd>{settings.working_hours}</dd>
          </dl>
          <div className="button-row">
            <button className="button yellow" onClick={openChat}>
              Tư vấn cùng Nở
            </button>
            <button className="button secondary" onClick={() => openBooking(undefined, 'survey')}>
              Hẹn khảo sát
            </button>
          </div>
        </aside>
        <section className="contact-map">
          <h2>Tìm đường đến văn phòng</h2>
          <iframe
            title="Bản đồ văn phòng Đất Phương Nam"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
          />
          <a
            className="text-button"
            href={settings.map_url || company.contact.map_url}
            target="_blank"
            rel="noreferrer"
          >
            Mở chỉ đường trên Google Maps <Icon name="arrow" size={16} />
          </a>
        </section>
      </div>
    </main>
  );
}

export function NewsPage({ blogs, category = '' }) {
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(1);
  const categories = [...new Set([...company.categories, ...blogs.map((b) => b.category)])];
  const filtered = [...blogs]
    .sort((a, b) => b.created - a.created)
    .filter(
      (b) =>
        (!category || b.category === category) &&
        normalize(`${b.title} ${b.excerpt}`).includes(normalize(query)),
    );
  const count = Math.ceil(filtered.length / 6),
    current = Math.min(page, Math.max(1, count));
  return (
    <main>
      <PageBanner title={category || 'Tin tức'} />
      <div className="container news-page">
        <aside className="page-sidebar">
          <nav className="page-directory" aria-label="Danh mục blog">
            <h2>Danh mục blog</h2>
            <a href="#/tin-tuc" aria-current={!category ? 'page' : undefined}>
              Tất cả bài viết <span>{blogs.length}</span>
            </a>
            {categories.map((c) => (
              <a key={c} href={categoryHref(c)} aria-current={category === c ? 'page' : undefined}>
                {c}
                <span>{blogs.filter((b) => b.category === c).length}</span>
              </a>
            ))}
          </nav>
          <div className="news-recent">
            <h3>Bài viết mới nhất</h3>
            {[...blogs]
              .sort((a, b) => b.created - a.created)
              .slice(0, 4)
              .map((b) => (
                <a key={b.id} href={blogHref(b.id)}>
                  <img src={b.image} alt="" loading="lazy" />
                  <span>{b.title}</span>
                </a>
              ))}
          </div>
        </aside>
        <section className="news-main">
          <div className="news-toolbar">
            <h2>{category || 'Tin tức & chia sẻ'}</h2>
            <label className="news-search">
              <Icon name="search" size={18} />
              <input
                aria-label="Tìm bài viết"
                placeholder="Tìm bài viết..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
          <p className="muted">
            {filtered.length} bài viết {query && `phù hợp với “${query}”`}
          </p>
          {filtered.length ? (
            <>
              <div className="news-grid">
                {filtered.slice((current - 1) * 6, current * 6).map((b) => (
                  <article className="news-card" key={b.id}>
                    <a href={blogHref(b.id)} tabIndex={-1} aria-hidden="true">
                      <img src={b.image} alt="" loading="lazy" />
                    </a>
                    <div>
                      <a className="eyebrow" href={categoryHref(b.category)}>
                        {b.category}
                      </a>
                      <time dateTime={new Date(b.created * 1000).toISOString()}>
                        {shortDate(b.created)}
                      </time>
                      <h3>
                        <a href={blogHref(b.id)}>{b.title}</a>
                      </h3>
                      <p>{b.excerpt}</p>
                      <a className="text-button" href={blogHref(b.id)}>
                        Đọc tiếp <Icon name="arrow" size={16} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
              {count > 1 && (
                <nav className="news-pagination" aria-label="Phân trang tin tức">
                  {Array.from({ length: count }, (_, i) => (
                    <button
                      key={i}
                      aria-current={current === i + 1 ? 'page' : undefined}
                      onClick={() => {
                        setPage(i + 1);
                        document.querySelector('.news-toolbar')?.scrollIntoView({ block: 'start' });
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </nav>
              )}
            </>
          ) : (
            <Empty
              icon="file"
              title="Chưa có bài viết phù hợp"
              text="Bạn có thể chọn chuyên mục khác hoặc xóa từ khóa tìm kiếm."
            />
          )}
        </section>
      </div>
    </main>
  );
}

export function ArticlePage({ article, blogs, openBooking }) {
  return (
    <main>
      <PageBanner title={article.title} parent={{ title: 'Tin tức', href: '#/tin-tuc' }} />
      <div className="container article-page">
        <article>
          <a className="eyebrow" href={categoryHref(article.category)}>
            {article.category}
          </a>
          <h2>{article.title}</h2>
          <p className="muted">Đăng ngày {shortDate(article.created)} · Đất Phương Nam</p>
          <p className="page-lead">{article.excerpt}</p>
          <img className="article-cover" src={article.image} alt={article.title} />
          <TextBody body={article.body} />
          <div className="page-cta">
            <h3>Bạn muốn được tư vấn thêm?</h3>
            <p>Đội ngũ Đất Phương Nam sẽ giúp bạn xác định nhu cầu và phương án thực hiện.</p>
            <button className="button yellow" onClick={() => openBooking()}>
              Gửi yêu cầu dịch vụ
            </button>
          </div>
        </article>
        <aside className="page-directory">
          <h2>Đọc thêm</h2>
          {blogs
            .filter((b) => b.id !== article.id)
            .sort(
              (a, b) =>
                Number(b.category === article.category) - Number(a.category === article.category),
            )
            .slice(0, 5)
            .map((b) => (
              <a key={b.id} href={blogHref(b.id)}>
                {b.title}
                <Icon name="chevron" size={14} />
              </a>
            ))}
          <a href="#/tin-tuc">Tất cả tin tức</a>
        </aside>
      </div>
    </main>
  );
}

export function PricingPage({ pricing, services, settings, openBooking }) {
  const [filter, setFilter] = useState('all'),
    [query, setQuery] = useState('');
  const items = pricing.filter(
    (p) =>
      (filter === 'all' || p.service_id === filter) && normalize(p.name).includes(normalize(query)),
  );
  const groups = [...new Set(items.map((p) => p.group))];
  return (
    <main>
      <PageBanner title="Bảng giá & chiết tính dịch vụ" />
      <section className="container pricing-page">
        <span className="eyebrow">RÕ HẠNG MỤC · ĐÚNG KHỐI LƯỢNG</span>
        <h2>Chủ động dự toán cho công việc của bạn</h2>
        <p className="page-lead">
          Chọn hạng mục, nhập khối lượng và nhận bảng chiết tính theo khoảng đơn giá. Nhân viên sẽ
          xác nhận giá cuối cùng sau khi nắm rõ hiện trạng.
        </p>
        <div className="pricing-steps">
          {[
            ['01', 'Chọn dịch vụ', 'Xem đơn vị và phạm vi công việc.'],
            ['02', 'Nhập khối lượng', 'Tính dự toán từ–đến theo bảng giá.'],
            ['03', 'Nhận chiết tính', 'Gửi yêu cầu, tải Excel và chờ tư vấn.'],
          ].map(([n, t, d]) => (
            <div key={n}>
              <b>{n}</b>
              <span>
                <h3>{t}</h3>
                <p>{d}</p>
              </span>
            </div>
          ))}
        </div>
        <div className="pricing-toolbar">
          <Field label="Nhóm dịch vụ">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Tất cả dịch vụ</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Tìm hạng mục"
            type="search"
            value={query}
            placeholder="Sofa, rèm, vệ sinh..."
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {groups.map((g) => (
          <section className="price-group" key={g}>
            <h3>{g}</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Hạng mục / phạm vi</th>
                    <th>Đơn vị</th>
                    <th>Từ (VNĐ)</th>
                    <th>Đến (VNĐ)</th>
                    <th>
                      <span className="sr-only">Yêu cầu</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((p) => p.group === g)
                    .map((p) => (
                      <tr key={p.id}>
                        <td>
                          <b>{p.name}</b>
                          <small>{p.note}</small>
                        </td>
                        <td>{p.unit}</td>
                        {p.survey_only ? (
                          <td colSpan={2}>Khảo sát báo giá</td>
                        ) : (
                          <>
                            <td>{money(p.min_rate)}</td>
                            <td>{money(p.max_rate)}</td>
                          </>
                        )}
                        <td>
                          <button
                            className="button primary small"
                            onClick={() =>
                              openBooking(
                                p.service_id,
                                p.survey_only ? 'survey' : 'quote',
                                p.subtype,
                                p.id,
                              )
                            }
                          >
                            {p.survey_only ? 'Hẹn khảo sát' : 'Tính chiết tính'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {!items.length && (
          <Empty
            icon="search"
            title="Chưa có hạng mục phù hợp"
            text="Bạn có thể đổi từ khóa hoặc yêu cầu khảo sát để được báo giá riêng."
          />
        )}
        <div className="pricing-note">
          <Icon name="file" />
          <div>
            <h3>Chiết tính được tính như thế nào?</h3>
            <p>
              Khối lượng × đơn giá từ/đến = khoảng tạm tính. Thuế cấu hình hiện tại:{' '}
              <b>{settings.tax_percent ?? 0}%</b>, được thể hiện riêng trên bảng chiết tính. Thuế và
              phạm vi cuối cùng cần được công ty xác nhận.
            </p>
            <p>
              Hạng mục di dời chỉ tính phần xe tải theo khoảng giá nêu trên; các việc tháo lắp, đóng
              gói, trung chuyển và bê bộ phải được khảo sát riêng.
            </p>
            <p>
              Đơn giá tham chiếu ban đầu từ{' '}
              <a
                href="https://dichvudatphuongnam.net/pages/bang-gia"
                target="_blank"
                rel="noreferrer"
              >
                bảng giá website công ty
              </a>
              ; các mức hiển thị được cập nhật bởi quản trị viên.
            </p>
          </div>
        </div>
        <div className="page-cta">
          <h3>Công việc của bạn cần báo giá riêng?</h3>
          <p>
            Nhân lực, tạp vụ, bảo trì, côn trùng hoặc nhu cầu chưa rõ khối lượng: để nhân viên khảo
            sát và tư vấn phương án phù hợp.
          </p>
          <div className="button-row">
            {services
              .filter((s) => filter === 'all' || s.id === filter)
              .map((s) => (
                <button
                  className="button white small"
                  key={s.id}
                  onClick={() => openBooking(s.id, 'survey')}
                >
                  {s.name}
                </button>
              ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main>
      <PageBanner title="Không tìm thấy nội dung" />
      <div className="container page-empty">
        <Empty
          title="Nội dung chưa được xuất bản"
          text="Trang hoặc bài viết có thể đã được cập nhật. Bạn có thể quay lại trang chủ hoặc xem các bài viết khác."
        />
        <a className="button primary" href="#">
          Về trang chủ
        </a>
      </div>
    </main>
  );
}
