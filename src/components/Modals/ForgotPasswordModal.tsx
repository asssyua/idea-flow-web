import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { authAPI } from '../../api';
import './Modal.css';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ForgotPasswordFormData {
  email: string;
}

const forgotPasswordSchema = yup.object({
  email: yup.string().email('Введите корректный email').required('Email обязателен'),
}).required();

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isTokenStep, setIsTokenStep] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!isTokenStep) {
        // Шаг 1: отправка токена на email
        await authAPI.forgotPassword(data.email);
        setSuccess('Мы отправили токен для сброса пароля на ваш email. Введите его ниже вместе с новым паролем.');
        setIsTokenStep(true);
      } else {
        // Шаг 2: сброс пароля по токену
        if (!resetToken.trim()) {
          setError('Введите токен из письма.');
          return;
        }

        if (!newPassword || !confirmPassword) {
          setPasswordError('Введите новый пароль и его подтверждение.');
          return;
        }

        if (newPassword.length < 6) {
          setPasswordError('Пароль должен быть не менее 6 символов.');
          return;
        }

        if (newPassword !== confirmPassword) {
          setPasswordError('Пароли должны совпадать.');
          return;
        }

        setPasswordError('');

        await authAPI.resetPassword({
          token: resetToken.trim(),
          password: newPassword,
        });

        setSuccess('Пароль успешно изменён! Теперь вы можете войти с новым паролем.');
        onSuccess();
        onClose();
      }
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при отправке запроса');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    // На шаге с токеном не закрываем модалку кликом по фону,
    // чтобы форма не закрывалась «сама» во время ввода токена
    if (!isTokenStep && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Восстановление пароля</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={errors.email ? 'error' : ''}
              placeholder="Введите ваш email"
            />
            {errors.email && (
              <span className="error-text">{errors.email.message}</span>
            )}
          </div>

          {!isTokenStep && (
            <p className="modal-info">
              На указанный email будут отправлены инструкции и токен для восстановления пароля.
            </p>
          )}

          {isTokenStep && (
            <>
              <div className="form-group">
                <label htmlFor="resetToken">Токен из письма</label>
                <input
                  id="resetToken"
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Вставьте токен из письма"
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">Новый пароль</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введите новый пароль"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmNewPassword">Подтвердите пароль</label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите новый пароль"
                />
                {passwordError && (
                  <span className="error-text">{passwordError}</span>
                )}
              </div>
            </>
          )}

          <div className="modal-actions modal-actions--single">
            <button
              type="submit"
              className="cta-button primary"
              disabled={isLoading}
            >
              {isLoading
                ? (isTokenStep ? 'Сохранение...' : 'Отправка...')
                : (isTokenStep ? 'Сбросить пароль' : 'Отправить')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;