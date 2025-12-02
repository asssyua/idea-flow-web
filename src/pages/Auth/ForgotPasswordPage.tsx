import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
import '../../styles/globals.css';
import '../../styles/animations.css';
import '../Home/HomePage.css';

interface ForgotPasswordFormData {
  email: string;
}

const forgotPasswordSchema = yup.object({
  email: yup.string().email('Введите корректный email').required('Email обязателен'),
}).required();

const ForgotPasswordPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isTokenStep, setIsTokenStep] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!isTokenStep) {
        await authAPI.forgotPassword(data.email);
        setSuccess('Мы отправили токен для сброса пароля на ваш email. Введите его ниже вместе с новым паролем.');
        setIsTokenStep(true);
      } else {
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
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при отправке запроса');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="home-page">
      <header className="header">
        <nav className="container">
          <Link to="/" className="logo">IdeaFlow</Link>
        </nav>
      </header>

      <main className="container">
        <div className="hero" style={{ maxWidth: 520, margin: '40px auto' }}>
          <h1>Восстановление пароля</h1>

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
                disabled={isTokenStep}
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

            <button
              type="submit"
              className="cta-button primary"
              disabled={isLoading}
            >
              {isLoading
                ? (isTokenStep ? 'Сохранение...' : 'Отправка...')
                : (isTokenStep ? 'Сбросить пароль' : 'Отправить')}
            </button>

            <div className="modal-footer" style={{ marginTop: 16 }}>
              <p>
                Вспомнили пароль?{' '}
                <Link to="/login" className="link-button">
                  Войти
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;







