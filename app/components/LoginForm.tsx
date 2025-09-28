'use client';

import { useState } from 'react';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import { LoginFormData } from '../types';

// Zod schema for login validation
const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email обязателен')
    .email('Введите корректный email'),
  password: z.string()
    .min(1, 'Пароль обязателен')
    .min(6, 'Пароль должен содержать минимум 6 символов')
});

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');
    setFieldErrors({});

    try {
      const parsed = loginSchema.safeParse(formData);
      if (!parsed.success) {
        const flat = parsed.error.flatten();
        setFieldErrors({
          email: flat.fieldErrors.email?.[0],
          password: flat.fieldErrors.password?.[0]
        });
        setIsSubmitting(false);
        return;
      }

      const validData = parsed.data;
      await signInWithEmailAndPassword(auth, validData.email, validData.password);
      
      setSubmitMessage('Успешный вход в систему!');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Ошибка при входе:', error);
      
      let errorMessage = 'Ошибка при входе в систему. Попробуйте снова.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Пользователь с таким email не найден.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Неверный пароль.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Некорректный email.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Слишком много попыток входа. Попробуйте позже.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
      } else if (error.message) {
        errorMessage = `Ошибка: ${error.message}`;
      }
      
      setSubmitMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Вход в систему
      </h1>
      
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            type="email"
            id="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Введите ваш email..."
          />
          {fieldErrors.email && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Пароль *
          </label>
          <input
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            type="password"
            id="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Введите ваш пароль..."
          />
          {fieldErrors.password && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
          )}
        </div>

        {/* Сообщение о результате */}
        {submitMessage && (
          <div className={`p-4 rounded-md ${
            submitMessage.includes('Успешный') 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {submitMessage}
          </div>
        )}

        {/* Кнопки */}
        <div className="space-y-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Вход...' : 'Войти'}
          </button>
          
          {onSwitchToRegister && (
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Нет аккаунта? Зарегистрироваться
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
