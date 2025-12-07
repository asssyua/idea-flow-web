import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../../components/Modals/LoginModal';
import lightImage from '../../assets/light.jpg';
import '../../styles/globals.css';
import '../../styles/animations.css';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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
          <a href="/" className="logo">IdeaFlow</a>
          <div className="nav-links">
            <button 
              className="login-btn" 
              onClick={() => setIsLoginModalOpen(true)}
            >
              Войти
            </button>
          </div>
        </nav>
      </header>

      <section 
        className="hero-section"
        style={{ backgroundImage: `url(${lightImage})` }}
      >
        <div className="container">
          <h1 className="hero-title">IdeaFlow</h1>
          <p className="hero-subtitle">
            Платформа для сбора идей и обратной связи от вашего сообщества
          </p>
          <p className="hero-description">
            Создавайте темы для обсуждения, собирайте идеи от пользователей, 
            анализируйте результаты и принимайте обоснованные решения.
          </p>
          <button className="cta-button primary" onClick={handleGetStarted}>
            Начать 
          </button>
        </div>
      </section>

      <section className="about-section">
        <div className="container">
          <h2 className="section-title">О приложении</h2>
          <div className="about-content">
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
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <p>© 2025 IdeaFlow. Все права защищены.</p>
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