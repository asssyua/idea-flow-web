import React from 'react';
import { SupportMessage } from './types';

interface SupportTabProps {
  supportMessages: SupportMessage[];
  supportLoading: boolean;
  onMarkAsRead: (id: string) => void;
}

const SupportTab: React.FC<SupportTabProps> = ({
  supportMessages,
  supportLoading,
  onMarkAsRead,
}) => {
  return (
    <div className="admin-section">
      <div className="admin-section__header">
        <h2>Сообщения поддержки</h2>
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
                  onClick={() => onMarkAsRead(msg.id)}
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
};

export default SupportTab;
