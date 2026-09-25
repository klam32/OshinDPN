import { useCallback, useEffect, useState } from 'react';
import catalog from './data/catalog.json';
import { api } from './lib/api';
import { Icon, Logo, Modal } from './components/ui';
import Booking from './components/Booking';
import { Account, Auth, Chat, Feedback } from './components/Customer';
import Admin from './components/Admin';
import Home from './components/Home';
import Header from './components/Header';

const fallbackSettings = {
  company_name: 'Oshin Thời Đại – Đất Phương Nam',
  hotline: '0901 040 484',
  email: 'thanhlan.datphuongnam@gmail.com',
  address: 'Cần Thơ và Đồng bằng sông Cửu Long',
  hero_title: 'Nhà sạch thảnh thơi.\nCuộc sống rạng ngời.',
  hero_description:
    'Từ tổ ấm đến nơi làm việc, Đất Phương Nam chăm chút từng không gian để bạn an tâm dành thời gian cho những điều yêu thương.',
};

export default function App() {
  const [data, setData] = useState({ services: catalog, settings: fallbackSettings, blogs: [] }),
    [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [offline, setOffline] = useState(false);
  const [route, setRoute] = useState(location.hash),
    [booking, setBooking] = useState(null),
    [auth, setAuth] = useState(false),
    [feedback, setFeedback] = useState(false),
    [chatOpen, setChatOpen] = useState(false),
    [blog, setBlog] = useState(null),
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
    closeFeedback = useCallback(() => setFeedback(false), []),
    closeBlog = useCallback(() => setBlog(null), []);
  const openBooking = (service, mode = 'quote', subtype) => setBooking({ service, mode, subtype });
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
            settings={data.settings}
            user={user}
            route={route}
            onBooking={openBooking}
            onAuth={() => setAuth(true)}
            onLogout={logout}
            onBlog={setBlog}
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
          ) : (
            <Home
              data={data}
              openBooking={openBooking}
              openChat={() => setChatOpen(true)}
              openBlog={setBlog}
            />
          )}
          <footer className="site-footer" id="contact">
            <div className="container footer-top">
              <div>
                <Logo light />
                <p>
                  Chăm sóc tận tâm, để mỗi ngày
                  <br />
                  của bạn nhẹ nhàng hơn một chút.
                </p>
                <span className="footer-location">
                  <Icon name="pin" size={17} /> {data.settings.address}
                </span>
              </div>
              <div>
                <h4>Khám phá</h4>
                <a href="#about">Về Đất Phương Nam</a>
                <a href="#services">Dịch vụ của chúng tôi</a>
                <a href="#process">Quy trình dịch vụ</a>
                <a href="#blog">Góc chia sẻ</a>
              </div>
              <div>
                <h4>Chăm sóc khách hàng</h4>
                <a href="#account">Yêu cầu của tôi</a>
                <a href="#faq">Câu hỏi thường gặp</a>
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
          user={user}
          onClose={closeBooking}
          onSuccess={() => setToast('Yêu cầu đã được lưu thành công.')}
        />
      )}
      {auth && <Auth onClose={closeAuth} onAuth={loggedIn} />}
      {feedback && <Feedback user={user} onClose={closeFeedback} />}
      {blog && (
        <Modal wide title={blog.title} onClose={closeBlog}>
          <article className="article-content">
            <img src={blog.image} alt={blog.title} />
            <span className="eyebrow">{blog.category}</span>
            <p className="article-intro">{blog.excerpt}</p>
            {blog.body.split('\n\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </article>
        </Modal>
      )}
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
