'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useState } from 'react';
import { z } from 'zod';
import { signInAction } from '../../firebase/actions';

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
  callbackUrl?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${pending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {pending ? 'Login...' : 'Login'}
    </button>
  );
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [_, formAction] = useActionState(signInAction, null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const onSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    // Client-side validation
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    // Update local state
    setFormData({ email, password });
    
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      setFieldErrors({
        email: flat.fieldErrors.email?.[0],
        password: flat.fieldErrors.password?.[0]
      });
      return;
    }
    
    // Clear previous errors
    setFieldErrors({});
    
    // Call server action
    const result = await signInAction(null, formData);
    
    if (result?.success) {
      setSubmitMessage('Login successful!');
      setIsSubmitting(false);
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }
    } else {
      setSubmitMessage(result?.error || 'Error logging in');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Login
      </h1>
      
      <form action={formAction} onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onSubmit(formData);
      }} className="space-y-6">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            autoComplete="email"
            className={`mt-1 block w-full px-3 py-2 border ${fieldErrors.email ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
            placeholder="Enter your email..."
          />
          {fieldErrors.email && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password *
          </label>
          <input
            name="password"
            value={formData.password || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            type="password"
            id="password"
            autoComplete="current-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password..."
          />
          {fieldErrors.password && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
          )}
        </div>

        {/* Сообщение о результате */}
        {submitMessage && (
          <div className={`p-4 rounded-md ${
            submitMessage.includes('successful') 
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
            {isSubmitting ? 'Login...' : 'Login'}
          </button>
          
          {onSwitchToRegister && (
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              No account? Register
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
