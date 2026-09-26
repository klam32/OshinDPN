import { useState } from 'react';
import { Icon, NoAvatar } from './ui';

export default function Home({ data, openBooking, openChat, openBlog }) {
  const [category, setCategory] = useState('all'),
    [faq, setFaq] = useState(0);
  const { services, settings, blogs } = data;
  const filters = {
    all: services.map((s) => s.id),
    family: ['cleaning', 'housekeeping', 'moving', 'pest'],
    business: ['cleaning', 'labor', 'maintenance', 'moving'],
    green: ['garden', 'pest'],
  };
  const questions = [
    [
      'Tôi chưa rõ khối lượng công việc, có thể yêu cầu báo giá không?',
      'Hoàn toàn có thể. Chọn “Khảo sát tận nơi”, điền họ tên, số điện thoại và địa chỉ. Nhân viên sẽ liên hệ xác nhận nhu cầu, lịch khảo sát và báo giá sau khi nắm rõ thực tế.',
    ],
    [
      'Giá hiển thị trên website đã là giá cuối cùng chưa?',
      'Chiết tính trực tuyến là mức tham khảo theo thông tin bạn nhập và đơn giá được cấu hình. Nhân viên sẽ xác nhận phạm vi công việc và giá cuối cùng với bạn trước khi thực hiện.',
    ],
    [
      'Tôi có thể nói chuyện trực tiếp với nhân viên không?',
      'Khi nhân viên đang trực tuyến, khung trò chuyện sẽ có mục “Tư vấn trực tiếp”. Khi nhân viên ngoại tuyến, Nở hỗ trợ tư vấn và hướng dẫn gửi yêu cầu.',
    ],
    [
      'Tôi nhận báo giá và thanh toán như thế nào?',
      'Bạn có thể tải file Excel trong mục “Yêu cầu của tôi”. Email được gửi khi hệ thống email đã được cấu hình. Sau khi hoàn thành công việc, thông tin QR thanh toán do công ty cung cấp sẽ hiển thị tại đơn hàng.',
    ],
  ];
  return (
    <main>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <i /> TẬN TÂM PHỤC VỤ · TRỌN VẸN AN TÂM
            </span>
            <h1>
              {settings.hero_title.split('\n').map((line, i) => (
                <span className={i ? 'highlight' : ''} key={i}>
                  {line}
                </span>
              ))}
            </h1>
            <p>{settings.hero_description}</p>
            <div className="hero-buttons">
              <button className="button primary" onClick={() => openBooking()}>
                Tìm dịch vụ phù hợp <Icon name="arrow" size={18} />
              </button>
              <button className="button white" onClick={openChat}>
                <Icon name="chat" size={19} /> Tư vấn cùng Nở
              </button>
            </div>
            <div className="hero-trust">
              <div className="trust-icon">
                <Icon name="shield" size={25} />
              </div>
              <span>
                <b>Chăm sóc tận tâm. Báo giá rõ ràng.</b>
                <small>Đồng hành cùng gia đình và doanh nghiệp Việt.</small>
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <img
              className="hero-photo"
              src="/images/hero.jpg"
              alt="Không gian phòng khách sáng, gọn gàng với cây xanh"
              fetchPriority="high"
            />
            <div className="image-caption">
              <span className="caption-dot" /> MỘT KHÔNG GIAN SẠCH. VẠN ĐIỀU AN YÊN.
            </div>
            <span className="hero-sparkle">✳</span>
            <div className="photo-badge">
              <span>
                <Icon name="check" size={21} />
              </span>
              <div>
                <b>Chăm chút từng góc nhỏ</b>
                <small>Để bạn thảnh thơi mỗi ngày</small>
              </div>
            </div>
            <div className="no-hero-card">
              <NoAvatar />
              <span>
                <b>Có Nở đây, bạn an tâm nhé!</b>
                <small>Tìm dịch vụ phù hợp cùng trợ lý của bạn</small>
              </span>
              <button aria-label="Mở trò chuyện với Nở" onClick={openChat}>
                <Icon name="arrow" size={20} />
              </button>
            </div>
          </div>
        </div>
        <div className="container value-strip">
          {[
            ['shield', 'Quy trình chuyên nghiệp', 'Chăm chút từ những điều nhỏ nhất'],
            ['file', 'Chi phí minh bạch', 'Xem chiết tính trước khi quyết định'],
            ['users', 'Đội ngũ tận tâm', 'Lắng nghe, thấu hiểu nhu cầu'],
            ['chat', 'Luôn sẵn sàng hỗ trợ', 'Nở và nhân viên đồng hành cùng bạn'],
          ].map(([icon, title, desc]) => (
            <div key={title}>
              <Icon name={icon} size={27} />
              <span>
                <b>{title}</b>
                <small>{desc}</small>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="section container" id="services">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DỊCH VỤ CỦA CHÚNG TÔI</span>
            <h2>
              Bạn cần gì, <em>Phương Nam có.</em>
            </h2>
            <p>Giải pháp cho tổ ấm, nơi làm việc và mọi không gian bạn yêu.</p>
          </div>
          <a href="#service-grid" className="text-button">
            Khám phá dịch vụ <Icon name="arrow" size={18} />
          </a>
        </div>
        <div className="filter-tabs">
          {[
            ['all', 'Tất cả dịch vụ'],
            ['family', 'Cho gia đình'],
            ['business', 'Cho doanh nghiệp'],
            ['green', 'Chăm sóc không gian'],
          ].map(([key, text]) => (
            <button
              className={category === key ? 'active' : ''}
              key={key}
              onClick={() => setCategory(key)}
            >
              {text}
              {key === 'all' && <span>{services.length}</span>}
            </button>
          ))}
        </div>
        <div className="service-grid" id="service-grid">
          {services
            .filter((s) => filters[category].includes(s.id))
            .map((s) => (
              <article className="service-card" key={s.id}>
                <button
                  className="service-image-button"
                  onClick={() => openBooking(s.id)}
                  aria-label={`Xem dịch vụ ${s.name}`}
                >
                  <img src={s.image} alt={s.name} loading="lazy" />
                  <span className="service-number">0{services.indexOf(s) + 1}</span>
                  {s.id === 'cleaning' && <span className="service-tag">CHĂM SÓC TOÀN DIỆN</span>}
                </button>
                <div className="service-content">
                  <span className="service-icon">
                    <Icon name={s.icon} size={23} />
                  </span>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <button className="service-link" onClick={() => openBooking(s.id)}>
                    <span>Khám phá & nhận báo giá</span>
                    <Icon name="arrow" size={18} />
                  </button>
                </div>
              </article>
            ))}
          <article className="survey-card">
            <span className="survey-icon">
              <Icon name="pin" size={33} />
            </span>
            <span className="eyebrow">CHƯA BIẾT BẮT ĐẦU TỪ ĐÂU?</span>
            <h3>
              Để chúng tôi
              <br />
              đến tận nơi, xem tận tình.
            </h3>
            <p>
              Không cần ước lượng chính xác. Nhân viên sẽ trao đổi và khảo sát để đề xuất phương án
              phù hợp.
            </p>
            <button className="button yellow" onClick={() => openBooking(undefined, 'survey')}>
              Yêu cầu khảo sát <Icon name="arrow" size={18} />
            </button>
            <span className="survey-decoration">✳</span>
          </article>
        </div>
      </section>
      <section className="process-section" id="process">
        <div className="container">
          <div className="center-heading">
            <span className="eyebrow">ĐƠN GIẢN TỪ BƯỚC ĐẦU TIÊN</span>
            <h2>
              Bạn trao nhu cầu. <em>Chúng tôi trao an tâm.</em>
            </h2>
            <p>Mọi bước đều rõ ràng, để bạn luôn chủ động với dịch vụ của mình.</p>
          </div>
          <div className="process-grid">
            {[
              [
                '01',
                'chat',
                'Chia sẻ nhu cầu',
                'Chọn dịch vụ, điền thông tin hoặc trò chuyện cùng Nở.',
              ],
              [
                '02',
                'file',
                'Nhận báo giá rõ ràng',
                'Xem chiết tính, hẹn khảo sát và thống nhất phương án.',
              ],
              [
                '03',
                'home',
                'Tận tâm thực hiện',
                'Đội ngũ đến theo lịch đã xác nhận và thực hiện công việc.',
              ],
              [
                '04',
                'heart',
                'Hài lòng & an tâm',
                'Nghiệm thu, thanh toán và gửi góp ý về trải nghiệm.',
              ],
            ].map(([n, icon, title, desc]) => (
              <div key={n}>
                <span className="process-number">{n}</span>
                <div className="process-icon">
                  <Icon name={icon} size={28} />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section container about-section" id="about">
        <div className="about-image">
          <img
            src="/images/company.jpg"
            alt="Hoạt động của công ty dịch vụ Đất Phương Nam"
            loading="lazy"
          />
          <div className="about-stamp">
            <Icon name="leaf" size={30} />
            <b>
              Tận tâm từ
              <br />
              những điều nhỏ
            </b>
          </div>
        </div>
        <div className="about-copy">
          <span className="eyebrow">OSHIN THỜI ĐẠI – ĐẤT PHƯƠNG NAM</span>
          <h2>
            Giữ không gian sạch.
            <br />
            <em>Gửi trọn sự tận tâm.</em>
          </h2>
          <p>
            Chúng tôi tin rằng một không gian được chăm sóc tốt mang lại nhiều hơn sự gọn gàng. Đó
            là sự thoải mái khi trở về nhà, là cảm hứng khi bắt đầu ngày làm việc.
          </p>
          <p>
            Đất Phương Nam đồng hành cùng gia đình và doanh nghiệp tại Cần Thơ và Đồng bằng sông Cửu
            Long với các dịch vụ thiết thực, phù hợp từng nhu cầu.
          </p>
          <div className="about-values">
            <span>
              <Icon name="check" /> Lắng nghe trước khi tư vấn
            </span>
            <span>
              <Icon name="check" /> Minh bạch trong từng hạng mục
            </span>
            <span>
              <Icon name="check" /> Đồng hành sau khi hoàn thành
            </span>
          </div>
          <a className="text-button" href="#/gioi-thieu">Tìm hiểu về công ty <Icon name="arrow" size={18} /></a>
        </div>
      </section>
      <section className="stats-strip">
        <div className="container stats-grid">
          {[
            ['20+', 'Năm kinh nghiệm', 'Tiên phong từ 2004 tại Cần Thơ'],
            ['7', 'Lĩnh vực dịch vụ', 'Từ vệ sinh đến cảnh quan & nhân lực'],
            ['2.000+', 'Lao động đồng hành', 'Tạo việc làm ổn định tại miền Tây'],
            ['Cần Thơ', '& Đồng bằng SCL', 'Phủ sóng rộng khắp khu vực'],
          ].map(([num, title, desc]) => (
            <div key={num} className="stat-card">
              <strong>{num}</strong>
              <span>{title}</span>
              <small>{desc}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="no-banner container">
        <div className="no-banner-avatar">
          <NoAvatar />
        </div>
        <div>
          <span className="eyebrow">MỘT NGƯỜI BẠN NHỎ, LUÔN SẴN SÀNG</span>
          <h2>“Bạn cứ hỏi, có Nở lo!”</h2>
          <p>
            Tìm hiểu dịch vụ, hướng dẫn báo giá hay kết nối nhân viên.
            <br />
            Nở sẽ cùng bạn bắt đầu thật dễ dàng.
          </p>
        </div>
        <button className="button yellow" onClick={openChat}>
          <Icon name="chat" /> Trò chuyện cùng Nở <Icon name="arrow" size={18} />
        </button>
        <span className="banner-flower">✳</span>
      </section>
      <section className="partners-section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ĐỐI TÁC & KHÁCH HÀNG</span>
            <h2>
              Đồng hành cùng <em>hơn 1.000+ doanh nghiệp</em>
            </h2>
            <p>Được tín nhiệm bởi các tổ chức tài chính, bệnh viện, trường học và tập đoàn tại miền Tây.</p>
          </div>
          <a href="#/lien-he" className="text-button">
            Hợp tác cùng chúng tôi <Icon name="arrow" size={18} />
          </a>
        </div>
        <div className="partners-showcase">
          <div className="partners-banner">
            <img
              src="https://cdn.hstatic.net/200001053360/file/khachhangtieubieu_642cb7148f264bdd8bb19fb8d9121277_grande.jpg"
              alt="Khách hàng và đối tác tiêu biểu Đất Phương Nam"
              loading="lazy"
            />
          </div>
          <div className="partners-video-card">
            <div className="video-responsive">
              <iframe
                src="https://www.youtube-nocookie.com/embed/Q4LAiDmdRmc?rel=0"
                title="Giới thiệu dịch vụ Oshin Thời Đại - Đất Phương Nam"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <div className="video-caption">
              <span className="caption-tag">HOẠT ĐỘNG THỰC TẾ</span>
              <h4>Xem quy trình phục vụ chuyên nghiệp của Đất Phương Nam</h4>
              <p>Trực tiếp ghi nhận tại các công trình văn phòng, cao ốc và nhà xưởng đối tác.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="section container" id="blog">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GÓC CHIA SẺ</span>
            <h2>
              Một chút chăm sóc. <em>Thêm nhiều niềm vui.</em>
            </h2>
            <p>Kinh nghiệm hữu ích cho không gian sống và làm việc của bạn.</p>
          </div>
          <a className="text-button" href="#/tin-tuc">Xem tất cả tin tức <Icon name="arrow" size={18}/></a>
        </div>
        <div className="blog-grid">
          {blogs.length ? (
            blogs.slice(0, 3).map((b) => (
              <article className="blog-card" key={b.id}>
                <button onClick={() => openBlog(b)}>
                  <img src={b.image} alt={b.title} loading="lazy" />
                </button>
                <span className="blog-category">{b.category}</span>
                <h3>
                  <button onClick={() => openBlog(b)}>{b.title}</button>
                </h3>
                <p>{b.excerpt}</p>
                <button className="text-button" onClick={() => openBlog(b)}>
                  Đọc bài viết <Icon name="arrow" size={16} />
                </button>
              </article>
            ))
          ) : (
            <p className="muted">Các bài viết chia sẻ sẽ được cập nhật tại đây.</p>
          )}
        </div>
      </section>
      <section className="faq-section container" id="faq">
        <div>
          <span className="eyebrow">CÓ THỂ BẠN ĐANG THẮC MẮC</span>
          <h2>
            Câu hỏi nhỏ.
            <br />
            <em>Giải đáp tận tình.</em>
          </h2>
          <p>Chưa tìm thấy câu trả lời bạn cần?</p>
          <button className="text-button" onClick={openChat}>
            Để Nở giúp bạn <Icon name="arrow" size={18} />
          </button>
        </div>
        <div className="faq-list">
          {questions.map(([q, a], i) => (
            <article className={faq === i ? 'expanded' : ''} key={q}>
              <button aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)}>
                {q}
                <Icon name={faq === i ? 'close' : 'plus'} size={18} />
              </button>
              {faq === i && <p>{a}</p>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
