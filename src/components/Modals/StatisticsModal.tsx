import React, { useEffect, useState } from 'react';
import { ideaAPI } from '../../api';
import './Modal.css';
import './StatisticsModal.css';

interface Statistics {
  totalIdeas: number;
  totalLikes: number;
  totalDislikes: number;
  totalComments: number;
  averageRating: number;
  ideasByTopic: Record<string, number>;
}

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StatisticsModal: React.FC<StatisticsModalProps> = ({ isOpen, onClose }) => {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchStatistics();
    }
  }, [isOpen]);

  const fetchStatistics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ideaAPI.getUserStatistics();
      setStatistics(response.data);
    } catch (err: any) {
      console.error('Failed to fetch statistics:', err);
      setError('Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content statistics-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Статистика моих идей</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="statistics-loading">
            <div className="loading-spinner"></div>
            <p>Загрузка статистики...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            {error}
          </div>
        ) : statistics ? (
          <div className="statistics-content">
            {/* Основные метрики */}
            <div className="statistics-grid">
              <div className="stat-card">
                <div className="stat-icon">💡</div>
                <div className="stat-value">{statistics.totalIdeas}</div>
                <div className="stat-label">Всего идей</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👍</div>
                <div className="stat-value">{statistics.totalLikes}</div>
                <div className="stat-label">Лайков</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👎</div>
                <div className="stat-value">{statistics.totalDislikes}</div>
                <div className="stat-label">Дизлайков</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💬</div>
                <div className="stat-value">{statistics.totalComments}</div>
                <div className="stat-label">Комментариев</div>
              </div>
            </div>

            {/* Рейтинг */}
            <div className="statistics-section">
              <h4 className="statistics-section-title">Общий рейтинг</h4>
              <div className="rating-card">
                <div className={`rating-value ${statistics.averageRating >= 0 ? 'positive' : 'negative'}`}>
                  {statistics.averageRating > 0 ? '+' : ''}{statistics.averageRating}
                </div>
                <div className="rating-label">
                  {statistics.averageRating > 0 
                    ? 'Положительный рейтинг' 
                    : statistics.averageRating < 0 
                    ? 'Отрицательный рейтинг' 
                    : 'Нейтральный рейтинг'}
                </div>
              </div>
            </div>

            {/* Идеи по темам */}
            {Object.keys(statistics.ideasByTopic).length > 0 && (
              <div className="statistics-section">
                <h4 className="statistics-section-title">Идеи по темам</h4>
                <div className="topics-stats-list">
                  {Object.entries(statistics.ideasByTopic)
                    .sort(([, a], [, b]) => b - a)
                    .map(([topicName, count]) => (
                      <div key={topicName} className="topic-stat-item">
                        <div className="topic-stat-name">{topicName}</div>
                        <div className="topic-stat-count">{count} {count === 1 ? 'идея' : count < 5 ? 'идеи' : 'идей'}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {statistics.totalIdeas === 0 && (
              <div className="empty-statistics">
                <p>У вас пока нет идей. Начните предлагать идеи к темам для обсуждения!</p>
              </div>
            )}
          </div>
        ) : null}

        <div className="modal-actions modal-actions--single">
          <button className="cta-button primary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatisticsModal;

