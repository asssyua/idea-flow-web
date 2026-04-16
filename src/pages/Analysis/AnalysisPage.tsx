import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, authAPI, profileAPI } from '../../api';
import '../../styles/globals.css';
import '../../styles/animations.css';
import '../Dashboard/Dashboard.css';
import './AnalysisPage.css';

interface UserStats {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  count: number;
}

interface StatisticsData {
  topTopicsCreators: UserStats[];
  topIdeasAuthors: UserStats[];
  topCommentsAuthors: UserStats[];
  topLikesReceivers: UserStats[];
}

 interface AdminUserProfile {
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
 }

 const EMPTY_STATISTICS: StatisticsData = {
  topTopicsCreators: [],
  topIdeasAuthors: [],
  topCommentsAuthors: [],
  topLikesReceivers: [],
 };

 const normalizeStatistics = (data: any): StatisticsData => ({
  topTopicsCreators: Array.isArray(data?.topTopicsCreators) ? data.topTopicsCreators : [],
  topIdeasAuthors: Array.isArray(data?.topIdeasAuthors) ? data.topIdeasAuthors : [],
  topCommentsAuthors: Array.isArray(data?.topCommentsAuthors) ? data.topCommentsAuthors : [],
  topLikesReceivers: Array.isArray(data?.topLikesReceivers) ? data.topLikesReceivers : [],
 });

 const isAdminRole = (role: unknown): boolean => {
  if (typeof role === 'string') {
    return role.toLowerCase() === 'admin';
  }

  if (role !== null && role !== undefined) {
    return String(role).toLowerCase() === 'admin';
  }

  return false;
 };

const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserProfile | null>(null);
  const [statistics, setStatistics] = useState<StatisticsData>(EMPTY_STATISTICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const adminTabs = [
    { id: 'users', label: 'Пользователи', path: '/dashboard?tab=users' },
    { id: 'support', label: 'Поддержка', path: '/dashboard?tab=support' },
    { id: 'topics', label: 'Темы', path: '/dashboard?tab=topics' },
    { id: 'ideas', label: 'Идеи', path: '/dashboard?tab=ideas' },
    { id: 'ideaflow', label: 'IdeaFlow', path: '/dashboard?tab=ideaflow' },
  ];

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  const fetchProfileAndStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      const profileResponse = await profileAPI.getProfile();
      const userData = profileResponse.data.user;
      setUser(userData);

      if (!isAdminRole(userData?.role)) {
        navigate('/user-dashboard');
        return;
      }
      
      const statsResponse = await adminAPI.getStatistics();
      setStatistics(normalizeStatistics(statsResponse.data));
    } catch (err: any) {
      console.error('Failed to fetch statistics:', err);
      setStatistics(EMPTY_STATISTICS);
      setError('Не удалось загрузить статистику');
      
      if (err.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0:
        return <span className="medal gold"><i className="fas fa-medal"></i></span>;
      case 1:
        return <span className="medal silver"><i className="fas fa-medal"></i></span>;
      case 2:
        return <span className="medal bronze"><i className="fas fa-medal"></i></span>;
      default:
        return <span className="medal">{index + 1}</span>;
    }
  };

  const getInitials = () => {
    if (!user) return 'AD';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
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

  const renderAdminHeader = () => (
    <header className="admin-header-bar">
      <div className="admin-header-inner container">
        <div className="logo-box" onClick={() => navigate('/dashboard?tab=ideaflow')}>
          <i className="fas fa-layer-group" style={{ color: 'var(--primary)' }}></i>
          IdeaFlow Admin
        </div>

        <div className="admin-nav">
          {adminTabs.map((tab) => (
            <a
              key={tab.id}
              className=""
              onClick={() => navigate(tab.path)}
            >
              {tab.label}
            </a>
          ))}

          <a className="active" onClick={() => navigate('/analysis')}>
            Анализ
          </a>

          <div
            className="profile-pill admin-profile-pill"
            title="Администратор"
            onClick={() => navigate('/dashboard?tab=profile')}
            style={{ cursor: 'pointer' }}
          >
            <div className="avatar-sq">{getInitials()}</div>
            <div className="admin-profile-text">
              <strong>Администратор</strong>
              <div>{user?.email || 'admin@ideaflow.com'}</div>
            </div>
          </div>

          <button onClick={handleLogout} className="header-logout-btn admin-logout-btn">
            Выйти
          </button>
        </div>
      </div>
    </header>
  );

  const renderStatsTable = (
    title: string,
    icon: string,
    data: UserStats[],
    countLabel: string
  ) => (
    <div className="stats-card">
      <div className="stats-card-header">
        <h3>
          <i className={icon}></i>
          {title}
        </h3>
        <span className="stats-count">{data.length} пользователей</span>
      </div>
      <div className="stats-table-wrapper">
        {data.length === 0 ? (
          <div className="empty-state">
            <p>Пока нет данных</p>
          </div>
        ) : (
          <table className="stats-table">
            <thead>
              <tr>
                <th className="rank-col">#</th>
                <th>Пользователь</th>
                <th className="count-col">{countLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user, index) => (
                <tr key={user.id} className={index < 3 ? 'top-three' : ''}>
                  <td className="rank-col">{getMedalIcon(index)}</td>
                  <td>
                    <div className="user-info">
                      <span className="user-name">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </td>
                  <td className="count-col">
                    <span className="count-badge">{user.count}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="analysis-page">
        {renderAdminHeader()}
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-page">
        {renderAdminHeader()}
        <div className="error-container">
          <h3>Ошибка</h3>
          <p>{error}</p>
          <button className="cta-button primary" onClick={() => navigate('/dashboard')}>
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-page">
      {renderAdminHeader()}
      
      <main className="analysis-content">
        <div className="container">
          <div className="analysis-header">
            <h1><i className="fas fa-chart-bar"></i> Анализ активности</h1>
            <p>Статистика и рейтинги пользователей платформы</p>
          </div>

          <div className="stats-grid">
            {renderStatsTable(
              'Топ по созданным темам',
              'fas fa-folder-open',
              statistics.topTopicsCreators,
              'Темы'
            )}
            
            {renderStatsTable(
              'Топ по опубликованным идеям',
              'fas fa-lightbulb',
              statistics.topIdeasAuthors,
              'Идеи'
            )}
            
            {renderStatsTable(
              'Топ по комментариям',
              'fas fa-comments',
              statistics.topCommentsAuthors,
              'Комментарии'
            )}
            
            {renderStatsTable(
              'Топ по полученным лайкам',
              'fas fa-heart',
              statistics.topLikesReceivers,
              'Лайки'
            )}
          </div>
        </div>
      </main>
      
      <footer className="analysis-footer">
        <div className="container">
          <p>© 2026 IdeaFlow Platform</p>
        </div>
      </footer>
    </div>
  );
};

export default AnalysisPage;
