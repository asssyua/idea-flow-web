import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../../components/Modals/LoginModal';
import '../../styles/globals.css';
import '../../styles/animations.css';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    featuresSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGetStarted = () => {
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    navigate('/dashboard');
  };

  return (
    <div className="home-page">
      {/* Header */}
      <header className="header">
        <nav className="container">
          <a href="/" className="logo">IdeaFlow</a>
          <div className="nav-links">
            <a href="#features">Возможности</a>
            <a href="#cases">Применение</a>
            <button 
              className="login-btn" 
              onClick={() => setIsLoginModalOpen(true)}
            >
              Войти
            </button>
          </div>
        </nav>
        
        <div className="hero container">
          <h1>Собирайте идеи. Принимайте решения.</h1>
          <p>
            IdeaFlow — современная платформа для краудсорсинга идей и обратной связи 
            от вашего сообщества, сотрудников или клиентов.
          </p>
          <div className="hero-actions">
            <button className="cta-button primary" onClick={handleGetStarted}>
              Начать бесплатно
            </button>
            <button className="cta-button secondary" onClick={scrollToFeatures}>
              Узнать больше
            </button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="features-section container">
        <h2>Как это работает?</h2>
        <div className="features-grid">
          <div className="feature-card slide-in-up">
            <div className="feature-icon">📋</div>
            <h3>Создайте Топик</h3>
            <p>Организуйте обсуждение по конкретным темам и задачам. Устанавливайте сроки и правила.</p>
          </div>
          
          <div className="feature-card slide-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="feature-icon">💡</div>
            <h3>Собирайте идеи и голоса</h3>
            <p>Ваша аудитория предлагает решения и голосует за лучшие интуитивными свайпами (Tinder-style).</p>
          </div>
          
          <div className="feature-card slide-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="feature-icon">📊</div>
            <h3>Анализируйте и действуйте</h3>
            <p>Получайте автоматические отчеты с лучшими идеями и статистикой. Принимайте обоснованные решения.</p>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="cases" className="use-cases-section">
        <div className="container">
          <h2>IdeaFlow для вашей сферы</h2>
          <div className="cases-grid">
            <div className="case-pill">Бизнес и корпорации</div>
            <div className="case-pill">Государственный сектор</div>
            <div className="case-pill">Образование</div>
            <div className="case-pill">НКО и сообщества</div>
            <div className="case-pill">Креативные проекты</div>
          </div>
          <p className="cases-description">
            Помогаем наладить диалог с сотрудниками, гражданами, студентами и клиентами.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Готовы вовлечь свою аудиторию?</h2>
          <button className="cta-button primary" onClick={handleGetStarted}>
            Начать бесплатно
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>© 2025 IdeaFlow. Все права защищены.</p>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default HomePage;