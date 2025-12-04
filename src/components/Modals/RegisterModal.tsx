import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { authAPI } from '../../api';
import './Modal.css';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSuccess: () => void;
}

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

const registerSchema = yup.object({
  email: yup.string().email('Введите корректный email').required('Email обязателен'),
  password: yup.string().min(6, 'Пароль должен быть не менее 6 символов').required('Пароль обязателен'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Пароли должны совпадать')
    .required('Подтверждение пароля обязательно'),
  firstName: yup.string().required('Имя обязательно'),
  lastName: yup.string().required('Фамилия обязательна'),
}).required();

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onRegisterSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCodeStep, setIsCodeStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    // Если уже на шаге подтверждения кода, не отправляем повторно регистрацию
    if (isCodeStep) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { confirmPassword, ...registerData } = data;
      await authAPI.register(registerData);

      setRegisteredEmail(data.email);
      setIsCodeStep(true);
      setSuccess('Мы отправили код подтверждения на ваш email. Введите его ниже, чтобы завершить регистрацию.');
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при регистрации');
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

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Регистрация в IdeaFlow</h3>
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

          {!isCodeStep && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">Имя</label>
                  <input
                    id="firstName"
                    {...register('firstName')}
                    className={errors.firstName ? 'error' : ''}
                    placeholder="Имя"
                  />
                  {errors.firstName && (
                    <span className="error-text">{errors.firstName.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Фамилия</label>
                  <input
                    id="lastName"
                    {...register('lastName')}
                    className={errors.lastName ? 'error' : ''}
                    placeholder="Фамилия"
                  />
                  {errors.lastName && (
                    <span className="error-text">{errors.lastName.message}</span>
                  )}
                </div>
              </div>

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
                  placeholder="Придумайте пароль"
                />
                {errors.password && (
                  <span className="error-text">{errors.password.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Подтвердите пароль</label>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'error' : ''}
                  placeholder="Повторите пароль"
                />
                {errors.confirmPassword && (
                  <span className="error-text">{errors.confirmPassword.message}</span>
                )}
              </div>

              <div className="modal-actions modal-actions--single">
                <button
                  type="submit"
                  className="cta-button primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
              </div>
            </>
          )}

          {isCodeStep && (
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
                />
                {verificationError && (
                  <span className="error-text">{verificationError}</span>
                )}
              </div>

              <div className="modal-actions modal-actions--single">
                <button
                  type="button"
                  className="cta-button primary"
                  disabled={isLoading || !verificationCode.trim()}
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      setVerificationError('');

                      const email = registeredEmail || watch('email');

                      await authAPI.verifyEmail({
                        email,
                        code: verificationCode.trim(),
                      });

                      setSuccess('Email успешно подтверждён! Регистрация завершена.');
                      onRegisterSuccess();
                      onClose();
                      reset();
                    } catch (err: any) {
                      setVerificationError(
                        err.response?.data?.message || 'Неверный код подтверждения'
                      );
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  {isLoading ? 'Проверка кода...' : 'Подтвердить код'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default RegisterModal;