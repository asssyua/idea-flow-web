import React from 'react';
import { AdminUser } from './types';

interface UsersTabProps {
  users: AdminUser[];
  usersLoading: boolean;
  onBlockClick: (id: string, userName: string) => void;
  onUnblockClick: (id: string, userName: string) => void;
}

const getUserStatusLabel = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'Активный';
    case 'blocked':
      return 'Заблокирован';
    case 'pending':
      return 'Ожидает подтверждения';
    default:
      return status;
  }
};

const UsersTab: React.FC<UsersTabProps> = ({
  users,
  usersLoading,
  onBlockClick,
  onUnblockClick,
}) => {
  return (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>Пользователи</h2>
      </div>

      {usersLoading ? (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="loading-spinner"></div>
          <p>Загружаем пользователей...</p>
        </div>
      ) : users.length === 0 ? (
        <p>Пользователи пока не найдены.</p>
      ) : (
        <div className="table-wrapper">
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
                      {getUserStatusLabel(u.status)}
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
                        onClick={() => onUnblockClick(u.id, `${u.firstName} ${u.lastName}`)}
                      >
                        Разблокировать
                      </button>
                    ) : u.role === 'admin' || u.role === 'ADMIN' ? (
                      <span className="admin-protected-badge">Администратор</span>
                    ) : (
                      <button
                        className="cta-button danger"
                        onClick={() => onBlockClick(u.id, `${u.firstName} ${u.lastName}`)}
                      >
                        Заблокировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersTab;
