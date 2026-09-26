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
  PricingPage,
  VisionPage,
  blogHref,
} from './components/Pages';

import { api } from './lib/api';
import { Icon, Logo } from './components/ui';
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
              <div>
                <Logo light />
                <p>
                  Dịch vụ cho gia đình và doanh nghiệp tại Cần Thơ, Đồng bằng sông Cửu Long. Đồng
                  hành từ năm 2004.
                </p>
                <span className="footer-location">
                  <Icon name="pin" size={17} /> {data.settings.address}
                </span>
              </div>
              <div>
                <h4>Khám phá</h4>
                <a href="#/gioi-thieu">Về Đất Phương Nam</a>
                <a href="#/lich-su-hinh-thanh">Lịch sử hình thành</a>
                <a href="#/tam-nhin-su-menh">Tầm nhìn sứ mệnh</a>
                <a href="#services">Dịch vụ của chúng tôi</a>
                <a href="#process">Quy trình dịch vụ</a>
                <a href="#/tin-tuc">Tin tức & chia sẻ</a>
              </div>
              <div>
                <h4>Chăm sóc khách hàng</h4>
                <a href="#account">Yêu cầu của tôi</a>
                <a href="#faq">Câu hỏi thường gặp</a>
                <a href="#/bang-gia">Bảng giá & chiết tính</a>
                <a href="#/lien-he">Gửi lời nhắn liên hệ</a>
                <button onClick={() => setFeedback(true)}>Phản hồi & báo lỗi</button>
                <button onClick={() => setChatOpen(true)}>Tư vấn cùng Nở</button>
              </div>
              <div>
                <h4>Kết nối với chúng tôi</h4>
                <a
                  className="footer-hotline"
                  href={`tel:${data.settings.hotline.replaceAll(' ', '')}`}
                >
                  <Icon name="phone" size={21} /> {data.settings.hotline}
                </a>
                <a className="footer-email" href={`mailto:${data.settings.email}`}>
                  {data.settings.email}
                </a>
                <button
                  className="button yellow small"
                  onClick={() => openBooking(undefined, 'survey')}
                >
                  Hẹn khảo sát <Icon name="arrow" size={16} />
                </button>
              </div>
            </div>
            <div className="container footer-bottom">
              <span>
                © {new Date().getFullYear()} {data.settings.company_name}.
              </span>
              <span>Khẳng định sự thành đạt</span>
            </div>
          </footer>
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
