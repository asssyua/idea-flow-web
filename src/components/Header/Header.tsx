import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../api';
import './Header.css';

interface User {
  firstName: string;
  lastName: string;
  role?: string;
}

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      setUser(null);
      setIsAdmin(false);
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      checkAdminRole(parsed);
    } catch {
      setUser(null);
      setIsAdmin(false);
    }
  }, [location.pathname]);

  const checkAdminRole = async (userData: User | null) => {
    if (!userData) {
      setIsAdmin(false);
      return;
    }
    
    let userRole: string | undefined = userData?.role;
    
    if (!userRole) {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userRole = payload.role;
        }
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }
    
    let isUserAdmin = false;
    if (userRole) {
      isUserAdmin = String(userRole).toLowerCase() === 'admin';
    }
    
    setIsAdmin(isUserAdmin);
  };

  const homePath = isAdmin ? '/dashboard' : '/user-dashboard';
  const topicsPath = isAdmin ? '/dashboard' : '/user-dashboard/topics';
  const profilePath = isAdmin ? '/dashboard' : '/user-dashboard/profile';
  const analysisPath = '/analysis';
  const dashboardPath = '/dashboard';

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
    if (path === analysisPath) {
      return location.pathname === analysisPath;
    }
    if (path === dashboardPath) {
      return location.pathname === dashboardPath;
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
            {isAdmin ? (
              <a
                className={isActive(analysisPath) ? 'active' : ''}
                onClick={() => navigate(analysisPath)}
              >
                Анализ
              </a>
            ) : (
              <a
                className={isActive(profilePath) ? 'active' : ''}
                onClick={() => navigate(profilePath)}
              >
                Мой профиль
              </a>
            )}
            {user && (
              <>
                {isAdmin && (
                  <button 
                    onClick={() => navigate(dashboardPath)} 
                    className={`header-admin-btn ${isActive(dashboardPath) ? 'active' : ''}`}
                  >
                    <span className="admin-avatar">{getInitials()}</span>
                    <span className="admin-label">Администратор</span>
                  </button>
                )}
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
