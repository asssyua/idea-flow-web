import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../../components/Modals/LoginModal';
import '../../styles/globals.css';
import '../../styles/animations.css';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleGetStarted = () => {
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    navigate('/dashboard');
  };

  return (
    <div className="home-page">
      <header className="header">
        <nav className="container">
          <div className="logo" onClick={() => navigate('/')}>
            <i className="fas fa-layer-group" style={{ color: 'var(--primary)' }}></i>
            IdeaFlow
          </div>
          <button
            type="button"
            className={`burger-btn ${menuOpen ? 'open' : ''}`}
            aria-label="Меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <a onClick={() => { setIsLoginModalOpen(true); setMenuOpen(false); }} style={{ cursor: 'pointer' }}>Темы</a>
            <button
              className="login-btn"
              onClick={() => { setIsLoginModalOpen(true); setMenuOpen(false); }}
            >
              Войти
            </button>
          </div>
        </nav>
      </header>

      <main className="container">
        <div className="welcome-card">
          <h1>Пространство ваших инициатив</h1>
          <p>Предлагайте идеи, обсуждайте проекты коллег и помогайте компании расти. Лучшие предложения попадут в итоговый отчет и будут реализованы.</p>
          <button className="btn btn-primary" onClick={handleGetStarted}>
            <i className="fas fa-plus"></i> Предложить идею
          </button>
        </div>

        <section className="about-section">
          <div className="about-content">
            <h2 className="section-title">О приложении</h2>
            <div className="about-text">
              <p>
                IdeaFlow — это современная платформа для краудсорсинга идей, 
                которая помогает организациям эффективно собирать обратную связь 
                от сотрудников, клиентов и сообщества.
              </p>
              <p>
                С помощью IdeaFlow вы можете создавать темы для обсуждения, 
                устанавливать дедлайны, собирать идеи и голоса пользователей, 
                а также получать подробную аналитику для принятия решений.
              </p>
              <p>
                Платформа подходит для бизнеса, государственных организаций, 
                образовательных учреждений и некоммерческих сообществ.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>© 2026 IdeaFlow Platform</p>
        </div>
      </footer>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default HomePage;