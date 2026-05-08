import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { authAPI } from '../../api';
import RegisterModal from './RegisterModal';
import ForgotPasswordModal from './ForgotPasswordModal';
import ContactSupportModal from './ContactSupportModal';
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
  const [showSupport, setShowSupport] = useState(false);
  const [blockedUserEmail, setBlockedUserEmail] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isVerificationStep, setIsVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const { register, handleSubmit, formState: { errors }, watch } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });

  const watchedEmail = watch('email');

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');
    setIsVerificationStep(false);

    try {
      const response = await authAPI.login(data);
      localStorage.setItem('access_token', response.data.access_token);

      try {
        const { profileAPI } = await import('../../api');
        const profileResponse = await profileAPI.getProfile();
        const userData = profileResponse.data?.user;
        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (profileErr) {
        console.error('Failed to fetch profile after login:', profileErr);
      }

      onLoginSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Ошибка при входе';
      const errorLower = errorMessage.toLowerCase();

      // Сначала проверяем блокировку (приоритет над верификацией)
      if (errorLower.includes('заблокирован') ||
          errorLower.includes('блокировка') ||
          errorLower.includes('blocked') ||
          errorLower.includes('обратитесь в поддержку')) {
        setIsVerificationStep(false);
        setError(errorMessage);
        const reasonMatch = errorMessage.match(/Причина: (.+?)\./) || errorMessage.match(/Reason: (.+?)\./);
        if (reasonMatch) {
          setBlockReason(reasonMatch[1]);
        }
        setBlockedUserEmail(data.email);
      }
      // Проверяем, связана ли ошибка с неподтверждённым email
      else if (errorLower.includes('подтвердите') ||
          errorLower.includes('вериф') ||
          errorLower.includes('verify')) {
        setUserEmail(data.email);
        setIsVerificationStep(true);
        setError('');
      } else {
        setIsVerificationStep(false);
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
        email: userEmail || watchedEmail,
        code: verificationCode.trim(),
      });

      // После успешной верификации автоматически логиним
      if (response.data?.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        onLoginSuccess();
        onClose();
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

      await authAPI.resendVerification(userEmail || watchedEmail);
      setResendSuccess('Код подтверждения отправлен повторно. Проверьте ваш email.');
    } catch (err: any) {
      setVerificationError(err.response?.data?.message || 'Не удалось отправить код');
    } finally {
      setResendLoading(false);
    }
  };

  if (!isOpen) return null;

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
        }}
      />
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Вход в IdeaFlow</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="modal-form">
          {error && (
            <div className="error-message">
              {error}
              {(error.includes('blocked') || error.includes('заблокирован')) && (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="cta-button secondary"
                    onClick={() => setShowSupport(true)}
                    style={{ width: '100%' }}
                  >
                    Связаться с поддержкой
                  </button>
                </div>
              )}
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
                На адрес <strong>{userEmail || watchedEmail}</strong> отправлен код.
                Введите его ниже.
              </p>
            </div>
          )}

          {resendSuccess && (
            <div className="success-message">
              {resendSuccess}
            </div>
          )}

          {!isVerificationStep && (
            <>
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
            </>
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

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className="cta-button primary"
                  disabled={isLoading || !verificationCode.trim()}
                  onClick={handleVerifyCode}
                  style={{ flex: 1 }}
                >
                  {isLoading ? 'Проверка...' : 'Подтвердить'}
                </button>

                <button
                  type="button"
                  className="cta-button secondary"
                  disabled={resendLoading}
                  onClick={handleResendCode}
                >
                  {resendLoading ? '...' : '↻'}
                </button>
              </div>

              <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
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
                  ← Назад к входу
                </button>
              </div>
            </>
          )}

          {!isVerificationStep && (
            <>
              <div className="modal-actions modal-actions--single">
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
            </>
          )}
        </form>
      </div>

      {showSupport && (
        <ContactSupportModal
          isOpen={showSupport}
          onClose={() => {
            setShowSupport(false);
            setBlockedUserEmail('');
            setBlockReason('');
          }}
          userEmail={blockedUserEmail}
          blockReason={blockReason}
        />
      )}
    </div>
  );
};

export default LoginModal;