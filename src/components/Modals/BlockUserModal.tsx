import React, { useState } from 'react';
import './Modal.css';

interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  userName: string;
}

const BlockUserModal: React.FC<BlockUserModalProps> = ({ isOpen, onClose, onConfirm, userName }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Укажите причину блокировки');
      return;
    }

    onConfirm(reason.trim());
    setReason('');
    setError('');
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Блокировка пользователя</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <p className="modal-info">
            Вы собираетесь заблокировать пользователя <strong>{userName}</strong>.
          </p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reason">Причина блокировки</label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Опишите причину блокировки. Это сообщение будет видно администратору и пользователю..."
              rows={4}
              required
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="cta-button secondary"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="cta-button danger"
            >
              Заблокировать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlockUserModal;


