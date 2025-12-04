import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileAPI, authAPI, topicAPI } from '../../api';
import TopicModal from '../../components/Modals/TopicModal';
import '../../styles/globals.css';
import '../../styles/animations.css';
import './UserDashboard.css';

interface UserProfile {
  firstName: string;
  lastName: string;
  status: string;
  email?: string;
  role?: string;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  ideaCount: number;
  createdAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  } | null;
}

const UserDashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [error, setError] = useState('');
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchTopics();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await profileAPI.getProfile();
      const userData = response.data.user;
      setUser(userData);
      
      // Если пользователь - админ, перенаправляем на админ панель
      const userRole = userData.role;
      const isAdmin = typeof userRole === 'string' 
        ? userRole.toLowerCase() === 'admin'
        : userRole === 'ADMIN' || userRole === 'admin';
      
      if (isAdmin) {
        navigate('/dashboard');
        return;
      }
      
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      setError('Не удалось загрузить профиль');
      
      if (err.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      setTopicsLoading(true);
      console.log('Fetching topics...');
      const response = await topicAPI.getPublicTopics();
      
      // Бэкенд возвращает массив напрямую
      let topicsData = [];
      
      if (Array.isArray(response.data)) {
        topicsData = response.data;
      } else if (response.data) {
        // Если это объект, пытаемся извлечь массив
        if (response.data.topics && Array.isArray(response.data.topics)) {
          topicsData = response.data.topics;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          topicsData = response.data.data;
        }
      }
      
      setTopics(topicsData);
    } catch (err: any) {
      console.error('Failed to fetch topics:', err);
      setTopics([]);
    } finally {
      setTopicsLoading(false);
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
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  const handleCreateTopic = async (data: {
    title: string;
    description: string;
    privacy: string;
    deadline: string | null;
  }) => {
    try {
      // Для обычных пользователей используется endpoint suggest
      // SuggestTopicDto принимает только title и description
      await topicAPI.suggestTopic({
        title: data.title,
        description: data.description,
      });
      setTopicModalOpen(false);
      // Показываем сообщение об успехе
      alert('Тема успешно предложена! Она будет отправлена на модерацию администратору.');
      fetchTopics(); // Обновляем список топиков
    } catch (err: any) {
      console.error('Failed to create topic:', err);
      const errorMessage = err.response?.data?.message || 'Не удалось предложить тему';
      alert(`Ошибка: ${errorMessage}`);
      throw err;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    
    if (deadlineDate < now) {
      return 'Истек';
    }
    
    return formatDate(deadline);
  };

  const handleStatisticsClick = () => {
    alert('Страница статистики находится в разработке');
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
    <div className="user-dashboard">
      <header className="user-dashboard-header">
        <div className="container">
          <div className="header-content">
            <h1 className="dashboard-title">
              Добро пожаловать, {user.firstName}!
            </h1>
            <button onClick={handleLogout} className="logout-btn">
              Выйти
            </button>
          </div>
        </div>
      </header>
      
      <main className="user-dashboard-content">
        <div className="container">
          <div className="dashboard-layout">
            {}
            <div className="topics-section">
              <h2 className="section-title">Темы для обсуждения</h2>
             
              
              
              {topicsLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Загрузка тем для обсуждения...</p>
                </div>
              ) : topics.length === 0 ? (
                <div className="empty-state">
                  <p>Пока нет доступных тем для обсуждения.</p>
                  <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Вы можете предложить свою тему для обсуждения, используя кнопку справа.
                  </p>
                </div>
              ) : (
                <div className="topics-grid">
                  {Array.isArray(topics) && topics.length > 0 ? (
                    topics.map((topic) => {
                      if (!topic || !topic.id) {
                        return null;
                      }
                      return (
                        <div 
                          key={topic.id} 
                          className="topic-card"
                        >
                          <div className="topic-header">
                            <h3 className="topic-title">{topic.title || 'Без названия'}</h3>
                            {topic.deadline && (
                              <span className={`topic-deadline ${new Date(topic.deadline) < new Date() ? 'expired' : ''}`}>
                                {formatDeadline(topic.deadline) || 'Истек'}
                              </span>
                            )}
                          </div>
                          <p className="topic-description">{topic.description || 'Нет описания'}</p>
                          <div className="topic-footer">
                            <div className="topic-meta">
                              <span className="topic-author">
                                Автор: {topic.createdBy ? `${topic.createdBy.firstName} ${topic.createdBy.lastName}` : 'Неизвестен'}
                              </span>
                              {topic.createdAt && (
                                <span className="topic-date">
                                  Создан: {formatDate(topic.createdAt)}
                                </span>
                              )}
                              <span className="topic-ideas">
                                Идей: {topic.ideaCount || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state">
                      <p>Ошибка: topics не является массивом или пуст</p>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Проверьте консоль браузера для деталей
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {}
            <aside className="sidebar">
              <div className="sidebar-card">
                <h3 className="sidebar-title">Действия</h3>
                <button
                  className="sidebar-button primary"
                  onClick={() => setTopicModalOpen(true)}
                >
                  <span className="button-icon">+</span>
                  Предложить свою тему для обсуждению
                </button>
                <button
                  className="sidebar-button secondary"
                  onClick={handleStatisticsClick}
                >
                  <span className="button-icon">📊</span>
                  Статистика
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>
      
      <footer className="user-dashboard-footer">
        <div className="container">
          <p>© 2025 IdeaFlow. Версия 1.0</p>
        </div>
      </footer>

      {}
      {topicModalOpen && (
        <TopicModal
          isOpen={topicModalOpen}
          onClose={() => setTopicModalOpen(false)}
          onSave={handleCreateTopic}
          topic={null}
          isUserMode={true}
        />
      )}
    </div>
  );
};

export default UserDashboard;

