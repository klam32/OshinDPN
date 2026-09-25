import { useCallback, useEffect, useRef, useState } from 'react';
import { Empty, Icon, Logo, Modal } from './ui';
import './Header.css';

const groupNames = {
  cleaning: 'Dịch vụ vệ sinh công nghiệp',
  labor: 'Dịch vụ cung ứng và quản lý nguồn lao động',
  maintenance: 'Dịch vụ bảo trì bảo dưỡng cao ốc văn phòng',
  housekeeping: 'Dịch vụ tạp vụ theo giờ, định kỳ',
  pest: 'Dịch vụ diệt côn trùng gây hại',
  moving: 'Dịch vụ vận chuyển, di dời',
  garden: 'Dịch vụ chăm sóc cây cảnh',
};
const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export default function Header({
  services,
  blogs,
  settings,
  user,
  route,
  onBooking,
  onAuth,
  onLogout,
  onBlog,
}) {
  const [mobile, setMobile] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [serviceOpen, setServiceOpen] = useState(null);
  const [announcement, setAnnouncement] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const header = useRef(null);
  const closeMenus = useCallback(() => {
    setMobile(false);
    setExpanded(null);
    setServiceOpen(null);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  useEffect(closeMenus, [route, closeMenus]);
  useEffect(() => {
    const outside = (e) => {
      if (!header.current?.contains(e.target)) closeMenus();
    };
    const escape = (e) => {
      if (e.key === 'Escape' && header.current?.contains(e.target)) {
        const trigger = e.target.closest('.menu-group')?.querySelector('.menu-trigger');
        closeMenus();
        (trigger || header.current.querySelector('.reference-mobile-toggle'))?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [closeMenus]);
  const desktop = () => window.matchMedia('(min-width: 1181px)').matches;
  const hover = (id) => (e) => {
    if (e.pointerType === 'mouse' && desktop()) setExpanded(id);
  };
  const leave = () => {
    if (desktop()) {
      setExpanded(null);
      setServiceOpen(null);
    }
  };
  const toggle = (id) => setExpanded((value) => (desktop() ? id : value === id ? null : id));
  const book = (service, mode = 'quote', subtype) => {
    closeMenus();
    closeSearch();
    onBooking(service, mode, subtype);
  };
  const group = (id, title, children) => (
    <div
      className={`menu-group ${expanded === id ? 'is-expanded' : ''}`}
      onPointerEnter={hover(id)}
      onPointerLeave={leave}
    >
      <button
        className="menu-trigger"
        aria-expanded={expanded === id}
        aria-controls={`header-${id}`}
        onClick={() => toggle(id)}
      >
        {title}
        <Icon name="down" size={11} />
      </button>
      {expanded === id && (
        <div className="dropdown-panel" id={`header-${id}`}>
          {children}
        </div>
      )}
    </div>
  );
  const needle = normalize(query.trim());
  const matches = services
    .flatMap((s) => s.subservices.map((subtype) => ({ service: s, subtype })))
    .filter(
      ({ service, subtype }) => !needle || normalize(`${service.name} ${subtype}`).includes(needle),
    );
  const articles = needle
    ? blogs.filter((b) => normalize(`${b.title} ${b.category}`).includes(needle))
    : [];
  return (
    <>
      {announcement && (
        <div className="topbar reference-topbar">
          <div className="container">
            <p>
              Oshin Thời Đại – Khẳng định sự thành đạt. Liên hệ ngay{' '}
              <a href={`tel:${settings.hotline.replaceAll(' ', '')}`}>{settings.hotline}</a>
              <span className="announcement-action">
                {' '}
                – <button onClick={() => book()}>Nhận tư vấn</button>
              </span>
            </p>
            <button
              className="announcement-close"
              aria-label="Đóng thông báo đầu trang"
              onClick={() => setAnnouncement(false)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      )}
      <header ref={header} className="site-header reference-header">
        <div className="container nav-wrap">
          <Logo />
          <nav
            id="main-navigation"
            className={`reference-nav ${mobile ? 'mobile-open' : ''}`}
            aria-label="Menu chính"
          >
            <a
              className={`menu-trigger ${!route || route === '#' ? 'current' : ''}`}
              href="#"
              onClick={closeMenus}
            >
              Trang chủ
            </a>
            {group(
              'about',
              'Giới thiệu',
              <>
                <a href="#about" onClick={closeMenus}>
                  Về Đất Phương Nam
                </a>
                <a href="#process" onClick={closeMenus}>
                  Quy trình dịch vụ
                </a>
                <a href="#faq" onClick={closeMenus}>
                  Câu hỏi thường gặp
                </a>
              </>,
            )}
            <div
              className={`menu-group services-menu ${expanded === 'services' ? 'is-expanded' : ''}`}
              onPointerEnter={hover('services')}
              onPointerLeave={leave}
            >
              <button
                className="menu-trigger"
                aria-expanded={expanded === 'services'}
                aria-controls="header-services"
                onClick={() => toggle('services')}
              >
                Dịch vụ
                <Icon name="down" size={11} />
              </button>
              {expanded === 'services' && (
                <div id="header-services" className="dropdown-panel services-dropdown">
                  <ul>
                    {services.map((s) => (
                      <li
                        className={serviceOpen === s.id ? 'service-expanded' : ''}
                        key={s.id}
                        onPointerEnter={(e) => {
                          if (e.pointerType === 'mouse' && desktop()) setServiceOpen(s.id);
                        }}
                      >
                        <button
                          className="service-menu-trigger"
                          aria-expanded={serviceOpen === s.id}
                          aria-controls={`submenu-${s.id}`}
                          onClick={() =>
                            setServiceOpen((v) => (desktop() ? s.id : v === s.id ? null : s.id))
                          }
                        >
                          {groupNames[s.id] || s.name}
                          <Icon name="chevron" size={13} />
                        </button>
                        {serviceOpen === s.id && (
                          <div className="service-submenu" id={`submenu-${s.id}`}>
                            {s.subservices.map((subtype) => (
                              <button key={subtype} onClick={() => book(s.id, 'quote', subtype)}>
                                {subtype}
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  {!services.length && <p className="menu-empty">Dịch vụ đang được cập nhật.</p>}
                </div>
              )}
            </div>
            {group(
              'projects',
              'Dự án',
              <>
                <a
                  href="https://dichvudatphuongnam.net/pages/du-an"
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMenus}
                >
                  Dự án của công ty <Icon name="arrow" size={14} />
                </a>
                <button onClick={() => book(undefined, 'survey')}>Tư vấn dự án mới</button>
              </>,
            )}
            <button className="menu-trigger" onClick={() => book()}>
              Bảng giá
            </button>
            {group(
              'news',
              'Tin tức',
              <>
                <a href="#blog" onClick={closeMenus}>
                  Tất cả bài viết
                </a>
                {[...new Set(blogs.map((b) => b.category))].map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      closeMenus();
                      onBlog(blogs.find((b) => b.category === category));
                    }}
                  >
                    {category}
                  </button>
                ))}
              </>,
            )}
            <a className="menu-trigger" href="#contact" onClick={closeMenus}>
              Liên hệ
            </a>
          </nav>
          <div className="reference-actions">
            {user ? (
              <>
                <a
                  className="reference-account"
                  href={user.role === 'admin' ? '#admin' : '#account'}
                  aria-label={user.role === 'admin' ? 'Mở trang quản trị' : 'Mở tài khoản của tôi'}
                  title={user.name}
                  onClick={closeMenus}
                >
                  <Icon name="user" size={26} />
                </a>
                <button
                  className="reference-logout"
                  aria-label="Đăng xuất"
                  onClick={() => {
                    closeMenus();
                    onLogout();
                  }}
                >
                  <Icon name="logout" size={19} />
                </button>
              </>
            ) : (
              <button
                className="reference-account"
                aria-label="Đăng nhập"
                title="Đăng nhập / Đăng ký"
                onClick={() => {
                  closeMenus();
                  onAuth();
                }}
              >
                <Icon name="user" size={26} />
              </button>
            )}
            <button
              className="reference-search"
              aria-label="Tìm kiếm"
              onClick={() => {
                closeMenus();
                setSearchOpen(true);
              }}
            >
              <Icon name="search" size={26} />
            </button>
            <button
              className="reference-mobile-toggle"
              aria-label={mobile ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={mobile}
              aria-controls="main-navigation"
              onClick={() => {
                setMobile(!mobile);
                setExpanded(null);
                setServiceOpen(null);
              }}
            >
              <Icon name={mobile ? 'close' : 'menu'} size={25} />
            </button>
          </div>
        </div>
      </header>
      {searchOpen && (
        <Modal title="Tìm dịch vụ hoặc bài viết" onClose={closeSearch}>
          <div className="header-search-content">
            <label className="header-search-input">
              <Icon name="search" />
              <input
                aria-label="Nội dung tìm kiếm"
                autoFocus
                placeholder="Vệ sinh, di dời, chăm sóc cây..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {matches.length > 0 && (
              <>
                <h3>Dịch vụ phù hợp</h3>
                <div className="header-search-results">
                  {matches.map(({ service, subtype }) => (
                    <button
                      key={`${service.id}-${subtype}`}
                      onClick={() => book(service.id, 'quote', subtype)}
                    >
                      <span>
                        <b>{subtype}</b>
                        <small>{service.name}</small>
                      </span>
                      <Icon name="arrow" size={17} />
                    </button>
                  ))}
                </div>
              </>
            )}
            {articles.length > 0 && (
              <>
                <h3>Bài viết</h3>
                <div className="header-search-results">
                  {articles.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        closeSearch();
                        onBlog(b);
                      }}
                    >
                      <span>{b.title}</span>
                      <Icon name="arrow" size={17} />
                    </button>
                  ))}
                </div>
              </>
            )}
            {!matches.length && !articles.length && (
              <Empty
                icon="search"
                title="Chưa tìm thấy kết quả"
                text="Bạn thử một từ khóa khác hoặc gọi hotline để được tư vấn nhé."
              />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
