import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api';
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
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.login(data);
      localStorage.setItem('access_token', response.data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при входе');
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
        <div className="hero" style={{ maxWidth: 480, margin: '40px auto' }}>
          <h1>Вход в IdeaFlow</h1>
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
              type="submit"
              className="cta-button primary"
              disabled={isLoading}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>

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


