import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiTrendingUp,
  FiDollarSign,
  FiPieChart,
  FiShield,
  FiZap,
  FiLock,
  FiUsers,
  FiAward,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import './HomePage.css';

const faqItems = [
  {
    question: 'Cexora là gì?',
    answer:
      'Cexora (CryptoExchange Oracle) là sàn giao dịch tiền điện tử hàng đầu tại Việt Nam, cung cấp đầy đủ sản phẩm Spot, Futures, P2P với công nghệ Oracle và lớp bảo mật tiên tiến.',
  },
  {
    question: 'Làm sao để bắt đầu giao dịch?',
    answer:
      'Chỉ cần đăng ký tài khoản, hoàn tất KYC, nạp tiền vào ví và bạn có thể giao dịch ngay trong vài phút với giao diện thân thiện.',
  },
  {
    question: 'Phí giao dịch là bao nhiêu?',
    answer:
      'Phí giao dịch Spot mặc định chỉ 0.1%. Người dùng giao dịch khối lượng lớn sẽ được áp dụng cấp độ VIP giảm phí hấp dẫn.',
  },
  {
    question: 'Cexora có an toàn không?',
    answer:
      '95% tài sản được lưu trữ ví lạnh, hỗ trợ xác thực hai lớp (2FA) và hệ thống giám sát thời gian thực giúp bảo vệ tài khoản tối đa.',
  },
  {
    question: 'Tôi có thể rút tiền bằng cách nào?',
    answer:
      'Bạn có thể rút tiền trực tiếp về tài khoản ngân hàng qua P2P hoặc chuyển crypto về ví cá nhân. Thời gian xử lý chỉ từ 5-30 phút.',
  },
];

const trustSignals = [
  { icon: FiShield, label: 'Bảo mật cao' },
  { icon: FiZap, label: 'Khớp lệnh tức thì' },
  { icon: FiLock, label: '95% tài sản ví lạnh' },
];

const marketPulseRows = [
  {
    label: 'Khối lượng Futures (24h)',
    value: '$8.4B',
    pill: { tone: 'positive', text: '+4.5%' },
  },
  {
    label: 'Đòn bẩy trung bình',
    value: '3.2x',
    pill: { tone: 'neutral', text: 'Ổn định' },
  },
];

const pulseAssets = [
  { pair: 'BTC/USDT', price: '$68,420', change: '+2.1%', tone: 'positive' },
  { pair: 'ETH/USDT', price: '$3,240', change: '-0.8%', tone: 'negative' },
  { pair: 'SOL/USDT', price: '$156', change: '+5.4%', tone: 'positive' },
];

const featureCards = [
  {
    icon: FiTrendingUp,
    title: 'Giao dịch Spot',
    description: 'Mua bán tức thời với giá thị trường minh bạch.',
    link: '/trading/spot',
  },
  {
    icon: FiPieChart,
    title: 'Giao dịch Futures',
    description: 'Chiến lược long/short linh hoạt cùng đòn bẩy tối đa 125x.',
    link: '/trading/futures',
  },
  {
    icon: FiDollarSign,
    title: 'Giao dịch P2P',
    description: 'Kết nối trực tiếp với merchant uy tín để nạp/rút VND.',
    link: '/trading/p2p',
  },
];

const benefitCards = [
  {
    icon: FiShield,
    title: 'Bảo mật tuyệt đối',
    description: 'Lưu trữ ví lạnh, đa chữ ký và giám sát thời gian thực.',
  },
  {
    icon: FiZap,
    title: 'Hiệu suất vượt trội',
    description: 'Công nghệ Oracle giúp khớp lệnh trong vài phần nghìn giây.',
  },
  {
    icon: FiDollarSign,
    title: 'Phí siêu cạnh tranh',
    description: 'Chỉ 0.1% cho Spot cùng nhiều chương trình hoàn phí.',
  },
  {
    icon: FiUsers,
    title: 'Hỗ trợ 24/7',
    description: 'Đội ngũ CSKH song ngữ luôn sẵn sàng đồng hành cùng bạn.',
  },
];

const HomePage = () => {
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [counters, setCounters] = useState({
    users: 0,
    volume: 0,
    coins: 0,
    countries: 0,
  });

  // Override MainLayout styles for Homepage
  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');

    // Store original styles
    const originalMarginLeft = mainContent ? mainContent.style.marginLeft : '';
    const originalPadding = mainContent ? mainContent.style.padding : '';
    const originalDisplay = sidebar ? sidebar.style.display : '';

    // Apply overrides
    if (mainContent) {
      mainContent.style.marginLeft = '0';
      mainContent.style.padding = '0';
    }
    if (sidebar) {
      sidebar.style.display = 'none';
    }

    // Cleanup
    return () => {
      if (mainContent) {
        mainContent.style.marginLeft = originalMarginLeft;
        mainContent.style.padding = originalPadding;
      }
      if (sidebar) {
        sidebar.style.display = originalDisplay;
      }
    };
  }, []);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    const targets = {
      users: 500000,
      volume: 5.2,
      coins: 200,
      countries: 150,
    };

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep += 1;
      const progress = Math.min(currentStep / steps, 1);
      setCounters({
        users: Math.floor(targets.users * progress),
        volume: (targets.volume * progress).toFixed(1),
        coins: Math.floor(targets.coins * progress),
        countries: Math.floor(targets.countries * progress),
      });

      if (progress === 1) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const toggleAccordion = (index) => {
    setActiveAccordion((prev) => (prev === index ? null : index));
  };

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-glow hero-glow-1" />
          <div className="hero-glow hero-glow-2" />
          <div className="hero-glow hero-glow-3" />
        </div>

        <div className="hero-grid">
          <div className="hero-left">
            <div className="hero-badge">
              <FiAward /> #1 Crypto Exchange in Vietnam
            </div>
            <h1 className="hero-title">
              Sàn Giao Dịch Crypto<br />
              <span className="gradient-text">Hàng Đầu Việt Nam</span>
            </h1>
            <p className="hero-description">
              Giao dịch Bitcoin, Ethereum và hơn 200 tài sản số với công nghệ Oracle tiên tiến. Bảo mật
              tuyệt đối, phí minh bạch và trải nghiệm mượt mà trên mọi thiết bị.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-large btn-glow">
                Bắt đầu giao dịch
              </Link>
              <Link to="/market" className="btn btn-secondary btn-large btn-outline">
                Xem thị trường
              </Link>
            </div>

            <div className="hero-metrics">
              <div className="hero-metric">
                <span className="metric-label">Người dùng</span>
                <span className="metric-value">{counters.users.toLocaleString()}+</span>
                <span className="metric-sub">đang tin tưởng Cexora</span>
              </div>
              <div className="hero-metric">
                <span className="metric-label">Khối lượng 24h</span>
                <span className="metric-value">${counters.volume}B</span>
                <span className="metric-sub">thanh khoản mạnh mẽ</span>
              </div>
              <div className="hero-metric">
                <span className="metric-label">Tài sản hỗ trợ</span>
                <span className="metric-value">{counters.coins}+</span>
                <span className="metric-sub">coin &amp; token niêm yết</span>
              </div>
            </div>

            <div className="trust-indicators">
              {trustSignals.map(({ icon: Icon, label }) => (
                <div key={label} className="trust-item">
                  <Icon className="trust-icon" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-panel">
              <div className="panel-header">
                <span>Nhiệt độ thị trường</span>
                <FiTrendingUp />
              </div>
              <div className="panel-body">
                {marketPulseRows.map((row) => (
                  <div className="panel-row" key={row.label}>
                    <div>
                      <p className="panel-label">{row.label}</p>
                      <p className="panel-value">{row.value}</p>
                    </div>
                    <span className={`panel-pill ${row.pill.tone}`}>{row.pill.text}</span>
                  </div>
                ))}
                <div className="panel-divider" />
                <div className="panel-assets">
                  {pulseAssets.map((asset) => (
                    <div key={asset.pair} className="asset-pill">
                      <span>{asset.pair}</span>
                      <strong>{asset.price}</strong>
                      <span className={asset.tone}>{asset.change}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel-footer">
                <FiPieChart />
                Cập nhật real-time qua mạng lưới Oracle
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Các sản phẩm giao dịch</h2>
        <div className="features-grid">
          {featureCards.map(({ icon: Icon, title, description, link }) => (
            <div key={title} className="feature-card">
              <div className="feature-icon">
                <Icon size={40} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <Link to={link} className="feature-link">
                Giao dịch ngay →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-icon">
              <FiUsers />
            </div>
            <h3 className="stat-value">{counters.users.toLocaleString()}+</h3>
            <p className="stat-label">Người dùng tin tưởng</p>
          </div>
          <div className="stat-item">
            <div className="stat-icon">
              <FiTrendingUp />
            </div>
            <h3 className="stat-value">${counters.volume}B</h3>
            <p className="stat-label">Khối lượng 24h</p>
          </div>
          <div className="stat-item">
            <div className="stat-icon">
              <FiDollarSign />
            </div>
            <h3 className="stat-value">{counters.coins}+</h3>
            <p className="stat-label">Loại tiền điện tử</p>
          </div>
          <div className="stat-item">
            <div className="stat-icon">
              <FiAward />
            </div>
            <h3 className="stat-value">{counters.countries}+</h3>
            <p className="stat-label">Quốc gia phục vụ</p>
          </div>
        </div>
      </section>

      <section className="why-choose-section">
        <h2 className="section-title">Tại sao chọn Cexora?</h2>
        <div className="benefits-grid">
          {benefitCards.map(({ icon: Icon, title, description }) => (
            <div key={title} className="benefit-card">
              <div className="benefit-icon">
                <Icon />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="faq-section">
        <h2 className="section-title">Câu hỏi thường gặp</h2>
        <div className="faq-container">
          {faqItems.map((faq, index) => (
            <div key={faq.question} className={`faq-item ${activeAccordion === index ? 'active' : ''}`}>
              <div className="faq-question" onClick={() => toggleAccordion(index)}>
                <h3>{faq.question}</h3>
                {activeAccordion === index ? <FiChevronUp /> : <FiChevronDown />}
              </div>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Sẵn sàng bắt đầu giao dịch?</h2>
          <p>Tham gia cùng 500,000+ nhà đầu tư đang phát triển tài sản trên Cexora.</p>
          <Link to="/register" className="btn btn-primary btn-large btn-glow">
            Đăng ký miễn phí
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

