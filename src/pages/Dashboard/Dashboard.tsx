import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileAPI, authAPI, adminAPI } from '../../api';
import BlockUserModal from '../../components/Modals/BlockUserModal';
import ConfirmModal from '../../components/Modals/ConfirmModal';
import '../../styles/globals.css';
import '../../styles/animations.css';
import './Dashboard.css';

interface UserProfile {
  firstName: string;
  lastName: string;
  status: string;
  email?: string;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  role: string;
  blockInfo?: {
    blockedAt: string;
    blockReason: string;
  };
}

interface SupportMessage {
  id: string;
  userEmail: string;
  userName: string;
  message: string;
  blockReason: string | null;
  isRead: boolean;
  createdAt: string;
}

type AdminTab = 'users' | 'topics' | 'ideas' | 'support';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [unblockModalOpen, setUnblockModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (isAdmin && activeTab === 'users') {
      loadUsers();
    } else if (isAdmin && activeTab === 'support') {
      loadSupportMessages();
    }
  }, [isAdmin, activeTab]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      setUser(response.data.user);
      setError('');

      // Отдельно проверяем, является ли пользователь админом,
      // используя существующий эндпоинт /profile/admin
      try {
        await profileAPI.getAdminProfile();
        setIsAdmin(true);
      } catch {
        setIsAdmin(false);
      }
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

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await adminAPI.getAllUsers();
      setUsers(response.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load users', err);
      setError('Не удалось загрузить список пользователей');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadSupportMessages = async () => {
    setSupportLoading(true);
    try {
      const response = await adminAPI.getAllSupportMessages();
      setSupportMessages(response.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load support messages', err);
      setError('Не удалось загрузить сообщения поддержки');
    } finally {
      setSupportLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await adminAPI.markSupportMessageAsRead(id);
      await loadSupportMessages();
    } catch (err) {
      console.error('Failed to mark message as read', err);
    }
  };

  const handleBlockClick = (id: string, userName: string) => {
    setSelectedUserId(id);
    setSelectedUserName(userName);
    setBlockModalOpen(true);
  };

  const handleBlockConfirm = async (reason: string) => {
    if (!selectedUserId) return;

    try {
      await adminAPI.blockUser(selectedUserId, { reason });
      setBlockModalOpen(false);
      setSelectedUserId(null);
      setSelectedUserName('');
      // Обновляем список пользователей после блокировки
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to block user', err);
      const errorMessage = err.response?.data?.message || 'Не удалось заблокировать пользователя';
      alert(errorMessage);
    }
  };

  const handleUnblockClick = (id: string, userName: string) => {
    setSelectedUserId(id);
    setSelectedUserName(userName);
    setUnblockModalOpen(true);
  };

  const handleUnblockConfirm = async () => {
    if (!selectedUserId) return;

    try {
      await adminAPI.unblockUser(selectedUserId);
      await loadUsers();
      setUnblockModalOpen(false);
      setSelectedUserId(null);
      setSelectedUserName('');
    } catch (err) {
      console.error('Failed to unblock user', err);
      alert('Не удалось разблокировать пользователя');
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

  const renderUsersTab = () => (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>Пользователи</h2>
        <p>Управляйте статусами, блокировками и доступом пользователей.</p>
      </div>

      {usersLoading ? (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="loading-spinner"></div>
          <p>Загружаем пользователей...</p>
        </div>
      ) : users.length === 0 ? (
        <p>Пользователи пока не найдены.</p>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Имя</th>
              <th>Статус</th>
              <th>Причина блокировки</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.firstName} {u.lastName}</td>
                <td>
                  <span className={`status-badge status-${u.status.toLowerCase()}`}>
                    {u.status}
                  </span>
                </td>
                <td>
                  {u.blockInfo?.blockReason ? (
                    <span className="block-reason-text">{u.blockInfo.blockReason}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="users-table__actions">
                  {u.status === 'blocked' || u.status === 'BLOCKED' ? (
                    <button
                      className="cta-button secondary"
                      onClick={() => handleUnblockClick(u.id, `${u.firstName} ${u.lastName}`)}
                    >
                      Разблокировать
                    </button>
                  ) : u.role === 'admin' || u.role === 'ADMIN' ? (
                    <span className="admin-protected-badge">Администратор</span>
                  ) : (
                    <button
                      className="cta-button danger"
                      onClick={() => handleBlockClick(u.id, `${u.firstName} ${u.lastName}`)}
                    >
                      Заблокировать
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderSupportTab = () => (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>Сообщения поддержки</h2>
        <p>Просматривайте обращения от заблокированных пользователей.</p>
      </div>

      {supportLoading ? (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="loading-spinner"></div>
          <p>Загружаем сообщения...</p>
        </div>
      ) : supportMessages.length === 0 ? (
        <p>Сообщений пока нет.</p>
      ) : (
        <div className="support-messages-list">
          {supportMessages.map((msg) => (
            <div key={msg.id} className={`support-message-card ${msg.isRead ? 'read' : 'unread'}`}>
              <div className="support-message-header">
                <div>
                  <strong>{msg.userName}</strong>
                  <span className="support-message-email">{msg.userEmail}</span>
                </div>
                <div className="support-message-meta">
                  <span className="support-message-date">
                    {new Date(msg.createdAt).toLocaleString('ru-RU')}
                  </span>
                  {!msg.isRead && (
                    <span className="unread-badge">Новое</span>
                  )}
                </div>
              </div>
              
              {msg.blockReason && (
                <div className="support-block-reason">
                  <strong>Причина блокировки:</strong> {msg.blockReason}
                </div>
              )}
              
              <div className="support-message-content">
                {msg.message}
              </div>
              
              {!msg.isRead && (
                <button
                  className="cta-button secondary"
                  onClick={() => handleMarkAsRead(msg.id)}
                  style={{ marginTop: '1rem' }}
                >
                  Отметить как прочитанное
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPlaceholder = (title: string, description: string) => (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="dashboard-message">
        <p>Функциональность находится в разработке. Здесь появятся инструменты управления {title.toLowerCase()}.</p>
      </div>
    </div>
  );

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
          <div className={`header-content ${isAdmin ? 'admin-header' : ''}`}>
            <h1 className="dashboard-title">
              Добро пожаловать в IdeaFlow, {user.firstName}!
            </h1>
            <div className="header-user-info">
              <span className="user-name">{user.firstName} {user.lastName}</span>
              <button onClick={handleLogout} className="logout-btn">
                Выйти
              </button>
            </div>
          </div>
          
          {isAdmin && (
            <div className="admin-tabs">
              {[
                { key: 'users', label: 'Пользователи' },
                { key: 'support', label: 'Поддержка' },
                { key: 'topics', label: 'Топики' },
                { key: 'ideas', label: 'Идеи' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key as AdminTab)}
                >
                  {tab.label}
                  {tab.key === 'support' && supportMessages.filter(m => !m.isRead).length > 0 && (
                    <span className="tab-badge">{supportMessages.filter(m => !m.isRead).length}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      
      <main className="dashboard-content">
        <div className="container">
          <div className="dashboard-welcome fade-in">
            <div className="welcome-card">
              {isAdmin ? (
                <>
                  {activeTab === 'users' && renderUsersTab()}
                  {activeTab === 'support' && renderSupportTab()}
                  {activeTab === 'topics' && renderPlaceholder('Топики', 'Создавайте, публикуйте и модерируйте топики.')}
                  {activeTab === 'ideas' && renderPlaceholder('Идеи', 'Просматривайте, модерируйте и продвигайте идеи участников.')}
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <footer className="dashboard-footer">
        <div className="container">
          <p>© 2025 IdeaFlow Dashboard. Версия 1.0</p>
        </div>
      </footer>

      {blockModalOpen && (
        <BlockUserModal
          isOpen={blockModalOpen}
          onClose={() => {
            setBlockModalOpen(false);
            setSelectedUserId(null);
            setSelectedUserName('');
          }}
          onConfirm={handleBlockConfirm}
          userName={selectedUserName}
        />
      )}

      {unblockModalOpen && (
        <ConfirmModal
          isOpen={unblockModalOpen}
          onClose={() => {
            setUnblockModalOpen(false);
            setSelectedUserId(null);
            setSelectedUserName('');
          }}
          onConfirm={handleUnblockConfirm}
          title="Разблокировка пользователя"
          message={`Вы уверены, что хотите разблокировать пользователя ${selectedUserName}?`}
          confirmText="Разблокировать"
          cancelText="Отмена"
          confirmButtonClass="secondary"
        />
      )}
    </div>
  );
};

export default Dashboard;