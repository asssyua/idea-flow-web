import React, { useState } from 'react';
import { adminAPI } from '../../api';
import './Modal.css';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  blockReason?: string;
}

const ContactSupportModal: React.FC<ContactSupportModalProps> = ({ 
  isOpen, 
  onClose, 
  userEmail,
  blockReason 
}) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Введите ваше сообщение');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await adminAPI.sendSupportMessage({
        email: userEmail,
        message: message.trim(),
        blockReason: blockReason || undefined,
      });
      
      setSuccess(true);
      setMessage('');
      
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось отправить сообщение. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !success) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Связаться с поддержкой</h3>
          {!success && (
            <button className="modal-close" onClick={onClose}>×</button>
          )}
        </div>

        {success ? (
          <div className="modal-form">
            <div className="success-message">
              <p>Ваше сообщение успешно отправлено!</p>
              <p>Мы свяжемся с вами в ближайшее время.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            {blockReason && (
              <div className="info-message">
                <p><strong>Причина блокировки:</strong> {blockReason}</p>
              </div>
            )}

            <p className="modal-info">
              Если вы считаете, что ваша учетная запись была заблокирована по ошибке, 
              пожалуйста, опишите ситуацию ниже. Мы рассмотрим ваше обращение.
            </p>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="message">Ваше сообщение</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Опишите ситуацию и почему вы считаете, что блокировка была ошибкой..."
                rows={6}
                required
              />
            </div>

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
                className="cta-button primary"
                disabled={isLoading}
              >
                {isLoading ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ContactSupportModal;

