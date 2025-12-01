import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { authAPI } from '../../api';
import RegisterModal from './RegisterModal';
import ForgotPasswordModal from './ForgotPasswordModal';
import '../../styles/globals.css';
import '../../styles/animations.css';
import './Modal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

interface LoginFormData {
  email: string;
  password: string;
}

const loginSchema = yup.object({
  email: yup.string().email('Введите корректный email').required('Email обязателен'),
  password: yup.string().required('Пароль обязателен'),
}).required();

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.login(data);
      localStorage.setItem('access_token', response.data.access_token);
      onLoginSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при входе');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (showRegister) {
    return (
      <RegisterModal
        isOpen={isOpen}
        onClose={() => {
          setShowRegister(false);
          onClose();
        }}
        onRegisterSuccess={() => {
          setShowRegister(false);
          alert('Регистрация успешна! Проверьте вашу почту для подтверждения email.');
        }}
      />
    );
  }

  if (showForgotPassword) {
    return (
      <ForgotPasswordModal
        isOpen={isOpen}
        onClose={() => {
          setShowForgotPassword(false);
          onClose();
        }}
        onSuccess={() => {
          setShowForgotPassword(false);
          alert('Инструкции по восстановлению пароля отправлены на ваш email');
        }}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Вход в IdeaFlow</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={errors.email ? 'error' : ''}
              placeholder="Ваш email"
            />
            {errors.email && (
              <span className="error-text">{errors.email.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className={errors.password ? 'error' : ''}
              placeholder="Ваш пароль"
            />
            {errors.password && (
              <span className="error-text">{errors.password.message}</span>
            )}
          </div>

          <button
            type="button"
            className="forgot-password-link"
            onClick={() => setShowForgotPassword(true)}
          >
            Забыли пароль?
          </button>

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
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </div>

          <div className="modal-footer">
            <p>
              Нет аккаунта?{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => setShowRegister(true)}
              >
                Зарегистрироваться
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;