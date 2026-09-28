import { useCallback, useEffect, useState } from 'react';
import catalog from './data/catalog.json';
import company from './data/company.json';
import priceSeed from './data/pricing.json';
import newsSeed from './data/news.json';
import {
  ArticlePage,
  CompanyPage,
  ContactPage,
  HistoryPage,
  JourneyPage,
  NewsPage,
  NotFoundPage,
  PolicyPage,
  PricingPage,
  VisionPage,
  blogHref,
} from './components/Pages';

import { api } from './lib/api';
import { Icon } from './components/ui';
import Booking from './components/Booking';
import { Account, Auth, Chat, Feedback } from './components/Customer';
import Admin from './components/Admin';
import Home from './components/Home';
import Header from './components/Header';

const fallbackSettings = {
  ...company.contact,
  company_name: 'Oshin Thời Đại – Đất Phương Nam',
  hotline: '0901 040 484',
  email: 'thanhlan.datphuongnam@gmail.com',
  address: company.contact.address,
  hero_title: 'Nhà sạch thảnh thơi.\nCuộc sống rạng ngời.',
  hero_description:
    'Từ tổ ấm đến nơi làm việc, Đất Phương Nam chăm chút từng không gian để bạn an tâm dành thời gian cho những điều yêu thương.',
  quick_contacts_enabled: true,
  quick_phone_enabled: true,
  quick_phone: '0901 040 484',
  quick_messenger_enabled: true,
  quick_messenger_url: 'https://m.me/datphuongnamdafuna',
  quick_email_enabled: true,
  quick_email: 'thanhlan.datphuongnam@gmail.com',
  quick_contact_enabled: true,
  quick_contact_url: '#/lien-he',
};

export default function App() {
  const [data, setData] = useState({
      services: catalog,
      settings: fallbackSettings,
      blogs: newsSeed,
      pages: company.pages,
      pricing: priceSeed,
    }),
    [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [offline, setOffline] = useState(false);
  const [route, setRoute] = useState(location.hash),
    [booking, setBooking] = useState(null),
    [auth, setAuth] = useState(false),
    [feedback, setFeedback] = useState(false),
    [chatOpen, setChatOpen] = useState(false),
    [toast, setToast] = useState('');
  const refresh = useCallback(async () => {
    try {
      setData(await api('/bootstrap'));
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);
  useEffect(() => {
    refresh();
    api('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => {})
      .finally(() => setReady(true));
    const change = () => {
      setRoute(location.hash);
      if (['#admin', '#account'].includes(location.hash)) window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, [refresh]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const closeBooking = useCallback(() => setBooking(null), []),
    closeAuth = useCallback(() => setAuth(false), []),
    closeFeedback = useCallback(() => setFeedback(false), []);
  const openBooking = (service, mode = 'quote', subtype, pricingId) =>
    setBooking({ service, mode, subtype, pricingId });
  const openBlog = (article) => {
    location.hash = blogHref(article.id);
  };
  const [path, query = ''] = route.replace(/^#\/?/, '').split('?');
  const contentPage = data.pages?.find((p) => p.id === path);
  const article = path.startsWith('bai-viet/')
    ? data.blogs.find((b) => blogHref(b.id) === route)
    : null;
  useEffect(() => {
    document.title = `${contentPage?.title || article?.title || { 'lien-he': 'Liên hệ', 'tin-tuc': 'Tin tức', 'bang-gia': 'Bảng giá & chiết tính' }[path] || 'Dịch vụ'} | Oshin Thời Đại – Đất Phương Nam`;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(path);
      if (target && !route.startsWith('#/')) target.scrollIntoView();
      else window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [route, contentPage?.title, article?.title]);
  const loggedIn = (u) => {
    setUser(u);
    setToast(`Chào mừng ${u.name}!`);
    if (u.role === 'admin') location.hash = 'admin';
  };
  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      location.hash = '';
      setToast('Bạn đã đăng xuất.');
    } catch (e) {
      setToast(e.message);
    }
  };
  const isAdmin = route === '#admin' && user?.role === 'admin';
  return (
    <>
      {isAdmin ? (
        <Admin user={user} logout={logout} onUpdate={refresh} />
      ) : (
        <>
          <Header
            services={data.services}
            blogs={data.blogs}
            pages={data.pages || []}
            settings={data.settings}
            user={user}
            route={route}
            onBooking={openBooking}
            onAuth={() => setAuth(true)}
            onLogout={logout}
            onBlog={openBlog}
          />
          {offline && (
            <div className="connection-notice">
              Chưa kết nối máy chủ. Bạn có thể xem dịch vụ; vui lòng khởi động backend để đặt lịch
              và tư vấn. <button onClick={refresh}>Thử lại</button>
            </div>
          )}
          {route === '#account' ? (
            <Account
              key={user?.id || 'guest'}
              user={user}
              settings={data.settings}
              openAuth={() => setAuth(true)}
              openBooking={openBooking}
              openFeedback={() => setFeedback(true)}
            />
          ) : route === '#admin' ? (
            <main className="access-page container">
              <Icon name="shield" size={50} />
              <h1>Khu vực quản trị</h1>
              <p>
                {!ready
                  ? 'Đang kiểm tra tài khoản...'
                  : 'Vui lòng đăng nhập bằng tài khoản Admin để quản lý website.'}
              </p>
              <button className="button primary" onClick={() => setAuth(true)}>
                Đăng nhập
              </button>
            </main>
          ) : contentPage?.id === 'lich-su-hinh-thanh' ? (
            <HistoryPage
              page={contentPage}
              data={data}
              openBooking={openBooking}
              openChat={() => setChatOpen(true)}
            />
          ) : contentPage?.id === 'tam-nhin-su-menh' ? (
            <VisionPage
              page={contentPage}
              data={data}
              openBooking={openBooking}
              openChat={() => setChatOpen(true)}
            />
          ) : contentPage?.id === 'hanh-trinh-phat-trien' ? (
            <JourneyPage
              page={contentPage}
              data={data}
              openBooking={openBooking}
              openChat={() => setChatOpen(true)}
            />
          ) : contentPage?.type === 'policy' ? (
            <PolicyPage page={contentPage} pages={data.pages || []} />
          ) : contentPage ? (
            <CompanyPage
              page={contentPage}
              data={data}
              openBooking={openBooking}
              openChat={() => setChatOpen(true)}
            />
          ) : path === 'lien-he' ? (
            <ContactPage
              key={user?.id || 'guest'}
              settings={data.settings}
              user={user}
              openChat={() => setChatOpen(true)}
              openBooking={openBooking}
            />
          ) : path === 'bang-gia' ? (
            <PricingPage
              pricing={data.pricing || []}
              services={data.services}
              settings={data.settings}
              openBooking={openBooking}
            />
          ) : path === 'tin-tuc' ? (
            <NewsPage
              key={query}
              blogs={data.blogs}
              category={new URLSearchParams(query).get('chuyen-muc') || ''}
              initialQuery={new URLSearchParams(query).get('tu-khoa') || ''}
            />
          ) : article ? (
            <ArticlePage article={article} blogs={data.blogs} openBooking={openBooking} />
          ) : route.startsWith('#/') ? (
            <NotFoundPage />
          ) : (
            <Home
              data={data}
              openBooking={openBooking}
              openChat={() => setChatOpen(true)}
              openBlog={openBlog}
            />
          )}
          <footer className="site-footer" id="contact">
            <div className="container footer-top">
              <div className="footer-about">
                <h4>GIỚI THIỆU</h4>
                <p>
                  Công ty TNHH dịch vụ Oshin Thời Đại – Đất Phương Nam là doanh nghiệp dịch vụ tích
                  hợp tại Đồng bằng sông Cửu Long. Chúng tôi cung cấp hệ sinh thái từ vệ sinh công
                  nghiệp, cung ứng lao động đến vận chuyển, bảo trì và chăm sóc cảnh quan.
                </p>
                <div className="footer-socials" aria-label="Mạng xã hội">
                  <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook">f</a>
                  <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" aria-label="YouTube">▶</a>
                  <a href="https://zalo.me/0901040484" target="_blank" rel="noreferrer" aria-label="Zalo">Z</a>
                </div>
              </div>
              <div className="footer-contact">
                <h4>THÔNG TIN LIÊN HỆ</h4>
                <strong>{data.settings.legal_name || data.settings.company_name}</strong>
                <span><b>Địa chỉ:</b> {data.settings.address}</span>
                <span><b>Điện thoại:</b> {data.settings.landline ? `${data.settings.landline} – ` : ''}<a href={`tel:${data.settings.hotline.replaceAll(' ', '')}`}>{data.settings.hotline}</a></span>
                <span><b>Email:</b> <a href={`mailto:${data.settings.email}`}>{data.settings.email}</a></span>
                <span><b>Website:</b> dichvudatphuongnam.net</span>
                {data.settings.tax_code && <span><b>MST:</b> {data.settings.tax_code}</span>}
              </div>
              <div className="footer-services">
                <h4>DỊCH VỤ CUNG CẤP</h4>
                {data.services.slice(0, 7).map((service) => (
                  <button key={service.id} onClick={() => openBooking(service.id)}>
                    {service.name}
                  </button>
                ))}
              </div>
              <div className="footer-policy">
                <h4>CHÍNH SÁCH & PHÁP LÝ</h4>
                <a href="#">Trang chủ</a>
                <a href="#/gioi-thieu">Giới thiệu</a>
                <a href="#/chinh-sach-bao-mat">Chính sách bảo mật</a>
                <a href="#/chinh-sach-doi-tra">Chính sách đổi trả</a>
                <a href="#/dieu-khoan-dich-vu">Điều khoản dịch vụ</a>
              </div>
            </div>
            <div className="container footer-bottom">
              <span>
                Copyright © {new Date().getFullYear()} {data.settings.company_name} | {data.settings.hotline}.
              </span>
              <span>Oshin Thời Đại – Khẳng định sự thành đạt</span>
            </div>
            <button className="footer-back-top" aria-label="Lên đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>⌃</button>
          </footer>
          {data.settings.quick_contacts_enabled && (
            <nav className="quick-contact-rail" aria-label="Liên hệ nhanh">
              {(data.settings.quick_phone_enabled ?? true) && (
                <a href={`tel:${String(data.settings.quick_phone || data.settings.hotline).replaceAll(' ', '')}`} className="quick-contact-phone" aria-label="Gọi điện thoại">
                  <Icon name="phone" size={20} /><span>Gọi ngay</span>
                </a>
              )}
              {(data.settings.quick_messenger_enabled ?? true) && data.settings.quick_messenger_url && (
                <a href={data.settings.quick_messenger_url} target="_blank" rel="noreferrer" className="quick-contact-messenger" aria-label="Nhắn Messenger">
                  <Icon name="chat" size={20} /><span>Messenger</span>
                </a>
              )}
              {(data.settings.quick_email_enabled ?? true) && data.settings.quick_email && (
                <a href={`mailto:${data.settings.quick_email}`} className="quick-contact-mail" aria-label="Gửi email">
                  <Icon name="mail" size={20} /><span>Email</span>
                </a>
              )}
              {(data.settings.quick_contact_enabled ?? true) && data.settings.quick_contact_url && (
                <a
                  href={data.settings.quick_contact_url}
                  target={data.settings.quick_contact_url.startsWith('https://') ? '_blank' : undefined}
                  rel={data.settings.quick_contact_url.startsWith('https://') ? 'noreferrer' : undefined}
                  className="quick-contact-map"
                  aria-label="Mở trang liên hệ hoặc bản đồ"
                >
                  <Icon name="pin" size={20} /><span>Liên hệ</span>
                </a>
              )}
            </nav>
          )}
          <Chat open={chatOpen} setOpen={setChatOpen} sessionKey={user?.id || 'guest'} />
          <button className="feedback-float" onClick={() => setFeedback(true)}>
            <Icon name="report" size={15} />
            <span>Góp ý</span>
          </button>
        </>
      )}
      {booking && (
        <Booking
          services={data.services}
          initialService={booking.service}
          initialMode={booking.mode}
          initialSubtype={booking.subtype}
          pricing={data.pricing || []}
          initialPricing={booking.pricingId}
          user={user}
          onClose={closeBooking}
          onSuccess={() => setToast('Yêu cầu đã được lưu thành công.')}
        />
      )}
      {auth && <Auth onClose={closeAuth} onAuth={loggedIn} />}
      {feedback && <Feedback user={user} onClose={closeFeedback} />}
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {toast}
          <button aria-label="Đóng thông báo" onClick={() => setToast('')}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </>
  );
}
