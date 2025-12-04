import React, { useState, useEffect } from 'react';
import './Modal.css';

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    privacy: string;
    deadline: string | null;
    status?: string;
  }) => void;
  topic?: {
    id: string;
    title: string;
    description: string;
    status: string;
    privacy: string;
    deadline: string | null;
  } | null;
  isUserMode?: boolean; 
}

const TopicModal: React.FC<TopicModalProps> = ({ isOpen, onClose, onSave, topic, isUserMode = false }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState('approved');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (topic) {
      setTitle(topic.title);
      setDescription(topic.description);
      setPrivacy(topic.privacy);
      setStatus(topic.status);
      if (topic.deadline) {
        const date = new Date(topic.deadline);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setDeadline(localDate.toISOString().slice(0, 16));
      } else {
        setDeadline('');
      }
    } else {
      setTitle('');
      setDescription('');
      setPrivacy('public');
      setStatus('approved');
      setDeadline('');
    }
    setError('');
  }, [topic, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Название темы для обсуждения обязательно');
      return;
    }

    if (!description.trim()) {
      setError('Описание темы для обсуждения обязательно');
      return;
    }

    setIsLoading(true);

    try {
      const deadlineValue = deadline ? new Date(deadline).toISOString() : null;
      
      const saveData: any = {
        title: title.trim(),
        description: description.trim(),
      };
      
 
      if (!isUserMode || topic) {
        saveData.privacy = privacy;
        saveData.deadline = deadlineValue;
      }
      
      if (topic) {
        saveData.status = status;
      }
      
      await onSave(saveData);
    } catch (err) {
      console.error('Error saving topic', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content topic-modal-content">
        <div className="modal-header">
          <h2>{topic ? 'Редактировать тему для обсуждения' : (isUserMode ? 'Предложить тему' : 'Создать тему для осбуждения')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="error-message" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">Название темы для обсуждения *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название темы"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Описание *</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание темы"
              rows={3}
              required
              disabled={isLoading}
            />
          </div>

          {!isUserMode && (
            <div className="form-group">
              <label htmlFor="privacy">Приватность</label>
              <select
                id="privacy"
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                disabled={isLoading}
              >
                <option value="public">Публичный</option>
                <option value="private">Приватный</option>
              </select>
            </div>
          )}
          
          {isUserMode && !topic && (
            <div style={{ 
              padding: '0.75rem', 
              background: '#e7f3ff', 
              borderRadius: '4px', 
              marginBottom: '1rem',
              fontSize: '0.9rem',
              color: '#0066cc'
            }}>
              <strong>Информация:</strong>После создания тема будет отправлена на модерацию администратору.
            </div>
          )}

          {topic && (
            <div className="form-group">
              <label htmlFor="status">Статус</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isLoading}
              >
                <option value="pending">Ожидает</option>
                <option value="approved">Одобрен</option>
                <option value="rejected">Отклонен</option>
                <option value="closed">Закрыт</option>
              </select>
            </div>
          )}

          {!isUserMode && (
            <div className="form-group">
              <label htmlFor="deadline">Дедлайн</label>
              <input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={isLoading}
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                Оставьте пустым, если дедлайн не требуется
              </small>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="cta-button secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="cta-button"
              disabled={isLoading}
            >
              {isLoading 
                ? 'Сохранение...' 
                : topic 
                  ? 'Сохранить изменения' 
                  : isUserMode 
                    ? 'Предложить тему' 
                    : 'Создать тему для обсуждения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TopicModal;

