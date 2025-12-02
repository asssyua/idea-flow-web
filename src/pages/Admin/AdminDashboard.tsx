import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, profileAPI } from '../../api';
import '../../styles/globals.css';
import '../../styles/animations.css';
import '../Dashboard/Dashboard.css';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем, что текущий пользователь — админ
    const checkAdminAndLoad = async () => {
      try {
        await profileAPI.getAdminProfile();
        await loadUsers();
      } catch (err: any) {
        // Если не админ или не авторизован — на главную
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndLoad();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminAPI.getAllUsers();
      setUsers(response.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load users', err);
      setError('Не удалось загрузить список пользователей');
    }
  };

  const handleBlock = async (id: string) => {
    const reason = window.prompt('Причина блокировки (для администратора):', 'Нарушение правил');
    if (!reason) return;

    const reasonForUser = window.prompt('Сообщение для пользователя:', reason) || reason;

    try {
      await adminAPI.blockUser(id, { reason, reasonForUser });
      await loadUsers();
    } catch (err) {
      console.error('Failed to block user', err);
      alert('Не удалось заблокировать пользователя');
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      await adminAPI.unblockUser(id);
      await loadUsers();
    } catch (err) {
      console.error('Failed to unblock user', err);
      alert('Не удалось разблокировать пользователя');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка админ-панели...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Ошибка</h3>
        <p>{error}</p>
        <button className="cta-button primary" onClick={() => navigate('/dashboard')}>
          В кабинет
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <h1 className="dashboard-title">
              Админ-панель IdeaFlow
            </h1>
            <button onClick={() => navigate('/dashboard')} className="logout-btn">
              Назад в профиль
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="container">
          <div className="dashboard-welcome fade-in">
            <div className="welcome-card">
              <h2>Пользователи</h2>
              {users.length === 0 ? (
                <p>Пользователи пока не найдены.</p>
              ) : (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Имя</th>
                      <th>Статус</th>
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
                          {u.status === 'BLOCKED' ? (
                            <button
                              className="cta-button secondary"
                              onClick={() => handleUnblock(u.id)}
                            >
                              Разблокировать
                            </button>
                          ) : (
                            <button
                              className="cta-button danger"
                              onClick={() => handleBlock(u.id)}
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
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <div className="container">
          <p>© 2025 IdeaFlow Admin. Версия 1.0</p>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;


