import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, profileAPI } from '../../api';
import '../../styles/globals.css';
import '../../styles/animations.css';
import '../Home/HomePage.css';

interface LoginFormData {
  email: string;
  password: string;
}

const loginSchema = yup.object({
  email: yup.string().email('Введите корректный email').required('Email обязателен'),
  password: yup.string().required('Пароль обязателен'),
}).required();

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [isVerificationStep, setIsVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });

  const watchedEmail = watch('email');

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.login(data);
      
      if (!response.data?.access_token) {
        throw new Error('Токен доступа не получен');
      }
      
      localStorage.setItem('access_token', response.data.access_token);
      
      try {
        const profileResponse = await profileAPI.getProfile();
        const userData = profileResponse.data?.user;

        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData));
        }

        const userRole = userData?.role;

        if (userRole === 'admin') {
          navigate('/dashboard');
        } else {
          navigate('/user-dashboard');
        }
      } catch (profileErr: any) {
        console.error('Profile fetch error:', profileErr);
        navigate('/user-dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Ошибка при входе. Проверьте правильность данных.';

      // Проверяем, связана ли ошибка с неподтверждённым email
      if (errorMessage.toLowerCase().includes('подтвердите') ||
          errorMessage.toLowerCase().includes('вериф') ||
          errorMessage.toLowerCase().includes('verify') ||
          err.response?.status === 403) {
        setEmail(data.email);
        setIsVerificationStep(true);
        setError('');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setIsLoading(true);
      setVerificationError('');
      setResendSuccess('');

      const response = await authAPI.verifyEmail({
        email: email || watchedEmail,
        code: verificationCode.trim(),
      });

      // После успешной верификации автоматически логиним
      if (response.data?.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        navigate('/user-dashboard');
      }
    } catch (err: any) {
      setVerificationError(err.response?.data?.message || 'Неверный код подтверждения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResendLoading(true);
      setResendSuccess('');
      setVerificationError('');

      await authAPI.resendVerification(email || watchedEmail);
      setResendSuccess('Код подтверждения отправлен повторно. Проверьте ваш email.');
    } catch (err: any) {
      setVerificationError(err.response?.data?.message || 'Не удалось отправить код');
    } finally {
      setResendLoading(false);
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
        <div className="hero" style={{ maxWidth: 480, margin: '40px auto' }}>
          <h1>Вход в IdeaFlow</h1>
          <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {isVerificationStep && (
              <div className="info-message" style={{
                background: '#e7f3ff',
                border: '1px solid #0066cc',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                color: '#0066cc'
              }}>
                <strong>Требуется подтверждение email</strong>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                  На адрес <strong>{email || watchedEmail}</strong> был отправлен код подтверждения.
                  Введите код ниже для завершения регистрации.
                </p>
              </div>
            )}

            {resendSuccess && (
              <div className="success-message">
                {resendSuccess}
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

            {!isVerificationStep && (
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
            )}

            {isVerificationStep && (
              <>
                <div className="form-group">
                  <label htmlFor="verificationCode">Код подтверждения</label>
                  <input
                    id="verificationCode"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value);
                      if (verificationError) setVerificationError('');
                    }}
                    placeholder="Введите код из письма"
                    disabled={isLoading}
                  />
                  {verificationError && (
                    <span className="error-text">{verificationError}</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="cta-button primary"
                    disabled={isLoading || !verificationCode.trim()}
                    onClick={handleVerifyCode}
                  >
                    {isLoading ? 'Проверка...' : 'Подтвердить email'}
                  </button>

                  <button
                    type="button"
                    className="cta-button secondary"
                    disabled={resendLoading}
                    onClick={handleResendCode}
                  >
                    {resendLoading ? 'Отправка...' : 'Отправить код повторно'}
                  </button>
                </div>

                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setIsVerificationStep(false);
                      setVerificationCode('');
                      setVerificationError('');
                      setResendSuccess('');
                    }}
                  >
                    ← Вернуться к входу
                  </button>
                </div>
              </>
            )}

            {!isVerificationStep && (
              <button
                type="submit"
                className="cta-button primary"
                disabled={isLoading}
              >
                {isLoading ? 'Вход...' : 'Войти'}
              </button>
            )}

            <div className="modal-footer" style={{ marginTop: 16 }}>
              <p>
                Забыли пароль?{' '}
                <Link to="/forgot-password" className="link-button">
                  Восстановить
                </Link>
              </p>
              <p>
                Нет аккаунта?{' '}
                <Link to="/register" className="link-button">
                  Зарегистрироваться
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
