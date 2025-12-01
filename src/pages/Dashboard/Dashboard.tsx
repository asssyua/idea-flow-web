import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileAPI, authAPI } from '../../api';
import '../../styles/globals.css';
import '../../styles/animations.css';
import './Dashboard.css';

interface UserProfile {
  firstName: string;
  lastName: string;
  status: string;
  email?: string;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      setUser(response.data.user);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      setError('Не удалось загрузить профиль');
      
      // Если ошибка 401, перенаправляем на главную
      if (err.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Все равно удаляем токен и делаем редирект
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Ошибка</h3>
        <p>{error}</p>
        <button className="cta-button primary" onClick={() => navigate('/')}>
          На главную
        </button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <h1 className="dashboard-title">
              Добро пожаловать в IdeaFlow, {user.firstName}!
            </h1>
            <button onClick={handleLogout} className="logout-btn">
              Выйти
            </button>
          </div>
        </div>
      </header>
      
      <main className="dashboard-content">
        <div className="container">
          <div className="dashboard-welcome fade-in">
            <div className="welcome-card">
              <h2>Ваш профиль</h2>
              <div className="profile-info">
                <div className="info-item">
                  <span className="info-label">Имя:</span>
                  <span className="info-value">{user.firstName} {user.lastName}</span>
                </div>
                {user.email && (
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{user.email}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">Статус аккаунта:</span>
                  <span className={`status-badge status-${user.status.toLowerCase()}`}>
                    {user.status}
                  </span>
                </div>
              </div>
              
              <div className="dashboard-message">
                <p>Здесь будет ваша рабочая область с топиками и идеями.</p>
                <p>Скоро вы сможете создавать топики, предлагать идеи и голосовать за лучшие предложения!</p>
              </div>
              
              <div className="coming-soon">
                <h3>Скоро доступно:</h3>
                <ul className="features-list">
                  <li>📋 Создание топиков для обсуждения</li>
                  <li>💡 Предложение идей по топикам</li>
                  <li>👍 Голосование за лучшие идеи</li>
                  <li>📊 Статистика и аналитика</li>
                  <li>👥 Управление участниками</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="dashboard-footer">
        <div className="container">
          <p>© 2025 IdeaFlow Dashboard. Версия 1.0</p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;