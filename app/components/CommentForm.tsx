'use client';

import { useState } from 'react';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase/firebase';

// Zod schema for comment validation
const commentSchema = z.object({
  content: z.string()
    .min(1, 'Комментарий не может быть пустым')
    .min(5, 'Комментарий должен содержать минимум 5 символов')
    .max(1000, 'Комментарий не должен превышать 1000 символов')
});

type CommentFormData = z.infer<typeof commentSchema>;

interface CommentFormProps {
  postId: string;
  onSuccess?: () => void;
}

export default function CommentForm({ postId, onSuccess }: CommentFormProps) {
  const [user, loading, error] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [formData, setFormData] = useState<CommentFormData>({
    content: ''
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      setSubmitMessage('Ошибка: Пользователь не авторизован');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');
    setFieldErrors({});

    try {
      const parsed = commentSchema.safeParse(formData);
      if (!parsed.success) {
        const flat = parsed.error.flatten();
        setFieldErrors({
          content: flat.fieldErrors.content?.[0]
        });
        setIsSubmitting(false);
        return;
      }

      const validData = parsed.data;

      const commentData = {
        ...validData,
        postId,
        authorId: user.uid,
        authorName: user.displayName || user.email || 'Анонимный пользователь',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'comments'), commentData);
      
      setSubmitMessage('Комментарий успешно добавлен!');
      setFormData({ content: '' });
      setFieldErrors({});
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Ошибка при добавлении комментария:', error);
      
      let errorMessage = 'Ошибка при добавлении комментария. Попробуйте снова.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Ошибка доступа. Проверьте настройки Firebase Security Rules.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Firebase недоступен. Проверьте подключение к интернету.';
      } else if (error.code === 'unauthenticated') {
        errorMessage = 'Ошибка аутентификации. Пожалуйста, войдите в систему снова.';
      } else if (error.message) {
        errorMessage = `Ошибка: ${error.message}`;
      }
      
      setSubmitMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="text-sm text-gray-500">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="text-red-500 text-sm">Ошибка авторизации: {error.message}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <p className="text-gray-600 text-sm">Для добавления комментария необходимо войти в систему</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Добавить комментарий</h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Ваш комментарий *
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            id="content"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Напишите ваш комментарий..."
          />
          {fieldErrors.content && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.content}</p>
          )}
        </div>

        {/* Сообщение о результате */}
        {submitMessage && (
          <div className={`p-3 rounded-md text-sm ${
            submitMessage.includes('успешно') 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {submitMessage}
          </div>
        )}

        {/* Кнопки */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSubmitting ? 'Добавление...' : 'Добавить комментарий'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({ content: '' });
              setFieldErrors({});
              setSubmitMessage('');
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
          >
            Очистить
          </button>
        </div>
      </form>
    </div>
  );
}