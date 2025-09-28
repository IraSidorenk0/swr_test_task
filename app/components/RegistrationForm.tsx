'use client';

import { useState } from 'react';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import { RegistrationFormData } from '../types';

// Zod schema for registration validation
const registrationSchema = z.object({
  email: z.string()
    .min(1, 'Email обязателен')
    .email('Введите корректный email'),
  password: z.string()
    .min(1, 'Пароль обязателен')
    .min(6, 'Пароль должен содержать минимум 6 символов')
    .max(100, 'Пароль не должен превышать 100 символов'),
  confirmPassword: z.string()
    .min(1, 'Подтверждение пароля обязательно'),
  displayName: z.string()
    .min(1, 'Имя пользователя обязательно')
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(50, 'Имя не должно превышать 50 символов')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

interface RegistrationFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export default function RegistrationForm({ onSuccess, onSwitchToLogin }: RegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [formData, setFormData] = useState<RegistrationFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');
    setFieldErrors({});

    try {
      const parsed = registrationSchema.safeParse(formData);
      if (!parsed.success) {
        const flat = parsed.error.flatten();
        setFieldErrors({
          email: flat.fieldErrors.email?.[0],
          password: flat.fieldErrors.password?.[0],
          confirmPassword: flat.fieldErrors.confirmPassword?.[0],
          displayName: flat.fieldErrors.displayName?.[0]
        });
        setIsSubmitting(false);
        return;
      }

      const validData = parsed.data;
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, validData.email, validData.password);
      
      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: validData.displayName
      });
      
      setSubmitMessage('Регистрация прошла успешно! Добро пожаловать!');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Ошибка при регистрации:', error);
      
      let errorMessage = 'Ошибка при регистрации. Попробуйте снова.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Пользователь с таким email уже существует.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Некорректный email.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Пароль слишком слабый. Используйте более сложный пароль.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Слишком много попыток регистрации. Попробуйте позже.';
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
        Регистрация
      </h1>
      
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
            Имя пользователя *
          </label>
          <input
            value={formData.displayName}
            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
            type="text"
            id="displayName"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Введите ваше имя..."
          />
          {fieldErrors.displayName && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.displayName}</p>
          )}
        </div>

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
            placeholder="Введите пароль (минимум 6 символов)..."
          />
          {fieldErrors.password && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Подтвердите пароль *
          </label>
          <input
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            type="password"
            id="confirmPassword"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Подтвердите пароль..."
          />
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        {/* Сообщение о результате */}
        {submitMessage && (
          <div className={`p-4 rounded-md ${
            submitMessage.includes('успешно') 
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
            {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
          
          {onSwitchToLogin && (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Уже есть аккаунт? Войти
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
