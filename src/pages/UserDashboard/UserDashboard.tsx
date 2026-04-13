import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { profileAPI, topicAPI, ideaAPI } from '../../api';
import '../../styles/globals.css';
import '../../styles/animations.css';
import TopicModal from '../../components/Modals/TopicModal';
import StatisticsModal from '../../components/Modals/StatisticsModal';
import { BadgeItem } from '../../components/BadgeList/BadgeList';
import Header from '../../components/Header/Header';
import TopicsListView from '../../components/Topics/TopicsListView';
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
  commentCount?: number;
  createdAt: string;
  status?: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  } | null;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  likes: number;
  dislikes: number;
  author?: {
    firstName: string;
    lastName: string;
  };
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

const getTopicTagLabel = (topic: Topic) => {
  if (topic.status?.toLowerCase() === 'approved') {
    return 'Активна';
  }

  if (topic.deadline && new Date(topic.deadline) < new Date()) {
    return 'Завершена';
  }

  return 'Обсуждение';
};

const UserDashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [favoriteTopics, setFavoriteTopics] = useState<Topic[]>([]);
  const [topIdeasByTopic, setTopIdeasByTopic] = useState<Record<string, Idea | null>>({});
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

  useEffect(() => {
    if (topics.length > 0) {
      fetchTopIdeasForTopics();
    }
  }, [topics]);

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
    }
  };

  const fetchTopIdeasForTopics = async () => {
    const topTopicsList = [...topics]
      .sort((a, b) => (b.ideaCount || 0) - (a.ideaCount || 0))
      .slice(0, 3);
    
    const ideasMap: Record<string, Idea | null> = {};
    
    await Promise.all(
      topTopicsList.map(async (topic) => {
        try {
          const response = await ideaAPI.getIdeasByTopic(topic.id);
          const ideas = Array.isArray(response.data) ? response.data : response.data?.ideas || [];
          
          if (ideas.length > 0) {
            // Find idea with most likes
            const topIdea = ideas.reduce((max: Idea, idea: Idea) => 
              (idea.likes || 0) > (max.likes || 0) ? idea : max
            );
            ideasMap[topic.id] = topIdea;
          } else {
            ideasMap[topic.id] = null;
          }
        } catch (err) {
          console.error(`Failed to fetch ideas for topic ${topic.id}:`, err);
          ideasMap[topic.id] = null;
        }
      })
    );
    
    setTopIdeasByTopic(ideasMap);
  };

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchStatistics();
    }
  }, [activeTab]);

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
      return ` ${formatDate(deadline)}`;
    }

    return formatDate(deadline);
  };

  const isTopicCompleted = (topic: Topic): boolean => {
    if (!topic.deadline) return false;
    const deadlineDate = new Date(topic.deadline);
    const now = new Date();
    return deadlineDate < now;
  };

  const activeTopics = topics.filter((t) => !isTopicCompleted(t));
  const completedTopics = topics.filter((t) => isTopicCompleted(t));

  const topTopics = [...topics]
    .sort((a, b) => (b.ideaCount || 0) - (a.ideaCount || 0))
    .slice(0, 3);

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
          {activeTab === 'home' && (
            <>
              <div className="welcome-card">
                <h1>Пространство ваших инициатив</h1>
                <p>Предлагайте идеи, обсуждайте проекты коллег и помогайте компании расти. Лучшие предложения попадут в итоговый отчет и будут реализованы.</p>
                <button className="btn btn-primary" onClick={() => navigate('/user-dashboard/topics')}>
                  <i className="fas fa-plus"></i> Предложить идею
                </button>
              </div>

              <h2 className="section-title">Популярные темы сообщества</h2>
              <div className="card">
                <div className="card-title report-card-title">
                  <h3><i className="fas fa-square-poll-vertical"></i> Популярные темы сообщества</h3>
                  
                </div>
                <div className="stats-row">
                  <div className="stat-item"><span className="stat-val">{topics.length}</span><span className="stat-lab">Темы</span></div>
                  <div className="stat-item"><span className="stat-val">{stats.ideasCount}</span><span className="stat-lab">Идеи</span></div>
                  <div className="stat-item"><span className="stat-val">{stats.commentsCount}</span><span className="stat-lab">Мнения</span></div>
                </div>
                <div className="card-title report-card-title-secondary"><h3>Топ-3 темы</h3></div>
                <div className="top-ideas-list">
                  {topTopics.length === 0 ? (
                    <div className="empty-state">
                      <p>Пока нет данных для отчета.</p>
                    </div>
                  ) : (
                    topTopics.map((topic) => {
                      const authorName = topic.createdBy
                        ? `${topic.createdBy.firstName} ${topic.createdBy.lastName}`
                        : 'Сообщество IdeaFlow';

                      return (
                        <div key={topic.id} className="idea-card-report" onClick={() => navigate(`/topic/${topic.id}`)}>
                          <div className="idea-info">
                            <div className="idea-header-row">
                              <div className="idea-name">{topic.title || 'Без названия'}</div>
                              <div className="likes-badge"><i className="fas fa-heart"></i> {topic.ideaCount || 0}</div>
                            </div>
                            <div className="idea-description">{topic.description || 'Описание темы отсутствует.'}</div>
                            <div className="idea-meta">
                              <span><i className="far fa-user"></i> {authorName}</span>
                              <span><i className="far fa-calendar"></i> {topic.createdAt ? formatDate(topic.createdAt) : 'Без даты'}</span>
                            </div>
                          </div>
                          <div className="top-comment-box">
                            <div className="comment-text-wrapper">
                              <i className="fas fa-quote-left comment-quote-icon"></i>
                              <span className="comment-text-preview">
                                {topIdeasByTopic[topic.id]
                                  ? topIdeasByTopic[topic.id]!.title
                                  : 'В этой теме пока нет идей.'}
                              </span>
                            </div>
                            <div className="comment-footer">
                              <div className="comment-likes">
                                <i className="fas fa-heart"></i> {topIdeasByTopic[topic.id]?.likes || 0}
                              </div>
                              {topIdeasByTopic[topic.id]?.author && (
                                <div className="comment-author">
                                  {topIdeasByTopic[topic.id]!.author!.firstName} {topIdeasByTopic[topic.id]!.author!.lastName}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'topics' && (
            <>
              <TopicsListView<Topic>
                topics={activeTopics}
                loading={topicsLoading}
                title="Активные темы обсуждения"
                actionLabel="+ Предложить тему"
                onActionClick={() => setTopicModalOpen(true)}
                onTopicClick={(topic) => navigate(`/topic/${topic.id}`)}
                getTopicTagLabel={getTopicTagLabel}
                formatDeadline={formatDeadline}
                emptyText="Пока нет активных тем для обсуждения."
                renderTopicAction={(topic) => {
                  const isFav = favoriteTopics.some((ft) => ft.id === topic.id);
                  return (
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
                  );
                }}
              />

              {completedTopics.length > 0 && (
                <TopicsListView<Topic>
                  topics={completedTopics}
                  loading={topicsLoading}
                  title="Завершённые темы"
                  onTopicClick={(topic) => navigate(`/topic/${topic.id}`)}
                  getTopicTagLabel={getTopicTagLabel}
                  formatDeadline={formatDeadline}
                  emptyText=""
                  renderTopicAction={(topic) => {
                    const isFav = favoriteTopics.some((ft) => ft.id === topic.id);
                    return (
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
                    );
                  }}
                />
              )}
            </>
          )}

          {activeTab === 'profile' && (
            <div className="profile-page">
              <div className="profile-header">
                <div className="avatar-sq profile-avatar-large">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </div>
                <div className="profile-main-info">
                  <h2>{user.firstName} {user.lastName}</h2>
                  <p className="profile-subtitle">{user.email || 'Участник платформы IdeaFlow'}</p>
                  <div className="stat-grid">
                    <div className="stat-box" data-icon="lightbulb"><label>Идей</label><span>{stats.ideasCount}</span></div>
                    <div className="stat-box" data-icon="comments"><label>Коммент.</label><span>{stats.commentsCount}</span></div>
                    <div className="stat-box" data-icon="heart"><label>Лайков</label><span>{stats.likesReceived}</span></div>
                    <div className="stat-box" data-icon="folder"><label>Темы</label><span>{stats.topicsCount}</span></div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title"><h3>Достижения</h3></div>
                <div className="badge-grid">
                  <div className={`badge-card ${stats.ideasCount >= 1 ? 'unlocked' : ''}`} title="Опубликовать первую идею (1 идея)">
                    <i className="fas fa-pen-nib"></i>
                    <div>Первый автор</div>
                  </div>
                  <div className={`badge-card ${stats.commentsCount >= 50 ? 'unlocked' : ''}`} title="Написать 50+ комментариев">
                    <i className="fas fa-comments"></i>
                    <div>Гуру комм.</div>
                  </div>
                  <div className={`badge-card ${stats.topicsCount >= 5 ? 'unlocked' : ''}`} title="Создать 5+ тем">
                    <i className="fas fa-crown"></i>
                    <div>Мастер тем</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title card-title-with-action">
                  <h3>Избранные темы</h3>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate('/user-dashboard/topics')}>
                    К темам →
                  </button>
                </div>
                {favoritesLoading ? (
                  <div className="loading-container" style={{ padding: '1rem' }}>
                    <div className="loading-spinner"></div>
                    <p>Загрузка...</p>
                  </div>
                ) : favoriteTopics.length === 0 ? (
                  <div className="empty-state">
                    <p>В избранном пока нет тем.</p>
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
                          <i className="fas fa-star"></i>
                          {topic.title || 'Без названия'}
                        </span>
                        <small>{topic.ideaCount || 0} идей</small>
                      </div>
                    ))}
                  </div>
                )}
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

