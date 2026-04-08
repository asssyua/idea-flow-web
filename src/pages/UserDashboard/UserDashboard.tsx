import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { profileAPI, authAPI, topicAPI, ideaAPI } from '../../api';
import '../../styles/globals.css';
import '../../styles/animations.css';
import TopicModal from '../../components/Modals/TopicModal';
import StatisticsModal from '../../components/Modals/StatisticsModal';
import BadgeList, { BadgeItem } from '../../components/BadgeList/BadgeList';
import Header from '../../components/Header/Header';
import './UserDashboard.css';

interface UserProfile {
  firstName: string;
  lastName: string;
  status: string;
  email?: string;
  role?: string;
  badges?: BadgeItem[];
  _count?: {
    ideas?: number;
    comments?: number;
    topics?: number;
  };
  rating?: number;
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

type UserTab = 'home' | 'topics' | 'profile';

const getActiveTabByPath = (pathname: string): UserTab => {
  if (pathname === '/user-dashboard/profile') {
    return 'profile';
  }

  if (pathname === '/user-dashboard/topics' || pathname.startsWith('/topic/')) {
    return 'topics';
  }

  return 'home';
};

interface UserStatistics {
  ideasCount: number;
  commentsCount: number;
  likesReceived: number;
  topicsCount: number;
  rating: number;
}

const UserDashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [favoriteTopics, setFavoriteTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [error, setError] = useState('');
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [statisticsModalOpen, setStatisticsModalOpen] = useState(false);
  const [stats, setStats] = useState<UserStatistics>({
    ideasCount: 0,
    commentsCount: 0,
    likesReceived: 0,
    topicsCount: 0,
    rating: 0,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getActiveTabByPath(location.pathname);

  useEffect(() => {
    fetchProfile();
    fetchTopics();
    fetchFavoriteTopics();
    fetchStatistics();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await profileAPI.getProfile();
      const userData = response.data.user;
      setUser(userData);
      setBadges(Array.isArray(userData.badges) ? userData.badges : []);
      
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

  const fetchFavoriteTopics = async () => {
    try {
      setFavoritesLoading(true);
      const response = await topicAPI.getFavoriteTopics();
      const data = Array.isArray(response.data) ? response.data : response.data?.topics || [];
      setFavoriteTopics(data);
    } catch (err: any) {
      setFavoriteTopics([]);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      setTopicsLoading(true);
      console.log('Fetching topics...');
      const response = await topicAPI.getPublicTopics();
      
      let topicsData = [];
      
      if (Array.isArray(response.data)) {
        topicsData = response.data;
      } else if (response.data) {
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

  const fetchStatistics = async () => {
    try {
      console.log('Fetching user statistics...');
      const response = await ideaAPI.getUserStatistics();
      console.log('Statistics response:', response.data);
      const data = response.data;
      setStats({
        ideasCount: data.totalIdeas ?? 0,
        commentsCount: data.totalComments ?? 0,
        likesReceived: data.totalLikes ?? 0,
        topicsCount: data.totalTopics ?? Object.keys(data.ideasByTopic || {}).length ?? 0,
        rating: data.averageRating ?? 0,
      });
    } catch (err: any) {
      console.error('Failed to fetch statistics:', err);
      console.error('Error response:', err.response?.data);
    }
  };

  // Fetch statistics when profile tab is opened
  useEffect(() => {
    if (activeTab === 'profile') {
      fetchStatistics();
    }
  }, [activeTab]);

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
      await topicAPI.suggestTopic({
        title: data.title,
        description: data.description,
      });
      setTopicModalOpen(false);
      fetchTopics();
    } catch (err: any) {
      console.error('CLIENT_VALIDATION_FAILED:', err);
      const errorMessage = err.response?.data?.message || 'Не удалось предложить тему';
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
    setStatisticsModalOpen(true);
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
      <Header />

      <main className="user-dashboard-content">
        <div className="container">
          {/* Home Tab */}
          {activeTab === 'home' && (
            <div className="welcome-card card">
              <h2>Пространство ваших инициатив</h2>
              <p>Предлагайте идеи, обсуждайте проекты коллег и помогайте компании расти. Лучшие предложения попадут в итоговый отчет и будут реализованы.</p>
              <button className="btn btn-primary" onClick={() => navigate('/user-dashboard/topics')}>
                <i className="fas fa-compass"></i> Перейти к темам
              </button>
            </div>
          )}

          {/* Topics Tab */}
          {activeTab === 'topics' && (
            <div className="topics-section-full">
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                    <i className="far fa-folder-open" style={{ marginRight: '10px' }}></i>
                    Активные темы обсуждения
                  </h2>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setTopicModalOpen(true)}
                  >
                    <i className="fas fa-plus" style={{ marginRight: '6px' }}></i> Предложить тему
                  </button>
                </div>
              </div>
             
              {topicsLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Загрузка тем для обсуждения...</p>
                </div>
              ) : topics.length === 0 ? (
                <div className="empty-state">
                  <p>Пока нет доступных тем для обсуждения.</p>
                </div>
              ) : (
                <div className="topics-grid">
                  {Array.isArray(topics) && topics.length > 0 ? (
                    topics.map((topic) => {
                      if (!topic || !topic.id) {
                        return null;
                      }
                      const isFav = favoriteTopics.some(ft => ft.id === topic.id);
                      return (
                        <div 
                          key={topic.id} 
                          className="topic-card"
                          onClick={() => navigate(`/topic/${topic.id}`)}
                        >
                          <div className="flex-between">
                            <h3 style={{ fontSize: '1.15rem' }}>{topic.title || 'Без названия'}</h3>
                            <i 
                              className={`${isFav ? 'fas' : 'far'} fa-star fav-btn`}
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  if (isFav) {
                                    await topicAPI.removeTopicFromFavorites(topic.id);
                                  } else {
                                    await topicAPI.addTopicToFavorites(topic.id);
                                  }
                                  fetchFavoriteTopics();
                                } catch (err) {
                                  console.error('Failed to toggle favorite:', err);
                                }
                              }}
                            ></i>
                          </div>
                          <p style={{ fontSize: '0.9rem' }}>{topic.description || 'Нет описания'}</p>
                          <div className="topic-meta">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="far fa-lightbulb" style={{ color: 'var(--text-muted)' }}></i> 
                              {topic.ideaCount || 0} идей
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="far fa-calendar" style={{ color: 'var(--text-muted)' }}></i> 
                              {topic.deadline ? `До ${formatDeadline(topic.deadline)}` : 'Без срока'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state">
                      <p>Ошибка: topics не является массивом или пуст</p>
                    </div>
                  )}
                </div>
              )}

              {/* Info hint */}
              <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <i className="far fa-comment-dots"></i> Выберите интересующую тему, чтобы изучить идеи коллег.
                <br />Чтобы добавить тему в избранное, нажмите на звездочку.
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="profile-page">
              {/* Profile Header with Large Avatar and Stats */}
              <div className="profile-header-card-large">
                <div className="profile-header-large">
                  <div className="avatar-large">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </div>
                  <div className="profile-main-info-large">
                    <h2>{user.firstName} {user.lastName}</h2>
                    <div className="profile-bio">
                      <i className="far fa-envelope"></i> {user.email || 'Пользователь'}
                    </div>
                    <div className="stat-grid-4">
                      <div className="stat-box-profile">
                        <label>Идей</label>
                        <span>{stats.ideasCount}</span>
                      </div>
                      <div className="stat-box-profile">
                        <label>Комментариев</label>
                        <span>{stats.commentsCount}</span>
                      </div>
                      <div className="stat-box-profile">
                        <label>Лайков (получено)</label>
                        <span>{stats.likesReceived}</span>
                      </div>
                      <div className="stat-box-profile">
                        <label>Тем создано</label>
                        <span>{stats.topicsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges Section */}
              <div className="card badges-section">
                <div className="card-title-with-icon">
                  <h3><i className="fas fa-medal"></i> Мои достижения</h3>
                  <span className="tag-badge">
                    {[
                      stats.ideasCount >= 1,
                      stats.commentsCount >= 50,
                      stats.topicsCount >= 5,
                      stats.likesReceived >= 100,
                      stats.ideasCount >= 20
                    ].filter(Boolean).length} / 5 получено
                  </span>
                </div>
                <div className="badge-grid">
                  {/* Первый автор */}
                  <div className={`badge-card ${stats.ideasCount >= 1 ? 'unlocked' : ''}`}>
                    <i className="fas fa-pen-nib"></i>
                    <p>Первый автор</p>
                    <small>Опубликована первая идея</small>
                  </div>
                  {/* Гуру комментариев */}
                  <div className={`badge-card ${stats.commentsCount >= 50 ? 'unlocked' : ''}`}>
                    <i className="fas fa-comments"></i>
                    <p>Гуру комм. (50+)</p>
                    <small>50+ комментариев</small>
                  </div>
                  {/* Мастер тем */}
                  <div className={`badge-card ${stats.topicsCount >= 5 ? 'unlocked' : ''}`}>
                    <i className="fas fa-crown"></i>
                    <p>Мастер тем</p>
                    <small>Создано 5+ тем</small>
                  </div>
                  {/* Сердце сообщества */}
                  <div className={`badge-card ${stats.likesReceived >= 100 ? 'unlocked' : ''}`}>
                    <i className="fas fa-heart-circle-check"></i>
                    <p>Сердце сообщества</p>
                    <small>100+ полученных лайков</small>
                  </div>
                  {/* Генератор идей */}
                  <div className={`badge-card ${stats.ideasCount >= 20 ? 'unlocked' : ''}`}>
                    <i className="fas fa-lightbulb"></i>
                    <p>Генератор идей</p>
                    <small>20+ идей</small>
                  </div>
                </div>
              </div>

              {/* Two Column Layout: Favorites + Placeholder for future content */}
              <div className="two-column-grid">
                <div className="card">
                  <div className="card-title-with-icon">
                    <h3><i className="far fa-bookmark"></i> Избранные темы</h3>
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={() => navigate('/user-dashboard/topics')}
                    >
                      К темам →
                    </button>
                  </div>
                  {favoritesLoading ? (
                    <div className="loading-container" style={{ padding: '1rem' }}>
                      <div className="loading-spinner"></div>
                      <p>Загрузка...</p>
                    </div>
                  ) : favoriteTopics.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <p>В избранном пока нет тем.</p>
                      <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        Добавляйте темы в избранное, нажимая на звездочку в списке тем.
                      </p>
                    </div>
                  ) : (
                    <div className="favorite-topics-list">
                      {favoriteTopics.slice(0, 5).map((topic) => (
                        <div 
                          key={topic.id} 
                          className="fav-topic-item"
                          onClick={() => navigate(`/topic/${topic.id}`)}
                        >
                          <span>
                            <i className="fas fa-star" style={{ color: '#F59E0B' }}></i>
                            {topic.title || 'Без названия'}
                          </span>
                          <small>{topic.ideaCount || 0} идей</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                    <i className="far fa-clock" style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block' }}></i>
                    Дополнительные функции<br/>в разработке
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="user-dashboard-footer">
        <div className="container">
          <p>© 2026 IdeaFlow Platform</p>
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

      {statisticsModalOpen && (
        <StatisticsModal
          isOpen={statisticsModalOpen}
          onClose={() => setStatisticsModalOpen(false)}
          initialBadges={badges}
        />
      )}
    </div>
  );
};

export default UserDashboard;

