import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../api';
import './Header.css';

interface User {
  firstName: string;
  lastName: string;
}

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const homePath = '/user-dashboard';
  const topicsPath = '/user-dashboard/topics';
  const profilePath = '/user-dashboard/profile';

  const isActive = (path: string) => {
    if (path === homePath) {
      return location.pathname === homePath;
    }
    if (path === topicsPath) {
      return location.pathname === topicsPath || location.pathname.startsWith('/topic/');
    }
    if (path === profilePath) {
      return location.pathname === profilePath;
    }
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  const getInitials = () => {
    if (!user) return '';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  const getShortName = () => {
    if (!user) return '';
    return `${user.firstName} ${user.lastName.charAt(0)}.`;
  };

  return (
    <header className="app-header">
      <div className="container">
        <div className="header-content">
          <div className="logo-box" onClick={() => navigate(homePath)}>
            <i className="fas fa-layer-group" style={{ color: 'var(--primary)' }}></i>
            IdeaFlow
          </div>
          <nav className="nav-links">
            <a
              className={isActive(homePath) ? 'active' : ''}
              onClick={() => navigate(homePath)}
            >
              Главная
            </a>
            <a
              className={isActive(topicsPath) ? 'active' : ''}
              onClick={() => navigate(topicsPath)}
            >
              Темы
            </a>
            <a
              className={isActive(profilePath) ? 'active' : ''}
              onClick={() => navigate(profilePath)}
            >
              Мой профиль
            </a>
            {user && (
              <>
                <div
                  className="profile-pill"
                  onClick={() => navigate(profilePath)}
                  title="Перейти в профиль"
                >
                  <div className="avatar-sq">{getInitials()}</div>
                  <div className="profile-pill-text">
                    <strong>{getShortName()}</strong>
                    <div className="profile-pill-subtitle">
                      <i className="fas fa-medal"></i> Участник
                    </div>
                  </div>
                </div>
                <button onClick={handleLogout} className="header-logout-btn">
                  Выйти
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
