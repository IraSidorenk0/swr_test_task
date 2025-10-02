'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase/firebase';
import { useAppDispatch } from '../../store/hooks';
import * as commentsActions from '../../store/slices/commentsSlice';

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
  const dispatch = useAppDispatch();
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
        content: validData.content,
        postId,
        authorId: user.uid,
        authorName: user.displayName || user.email || 'Анонимный пользователь',
      };

      await dispatch(commentsActions.createComment(commentData));
      
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
      <div className="card p-6 text-center animate-fade-in">
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Авторизация требуется</h3>
        <p className="text-gray-600 text-sm mb-4">Для добавления комментария необходимо войти в систему</p>
        <p className="text-xs text-gray-500">Войдите через навигационное меню вверху страницы</p>
      </div>
    );
  }

  return (
    <div className="card p-6 animate-fade-in">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        ✍️ Добавить комментарий
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="content" className="form-label">
            💬 Ваш комментарий *
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            id="content"
            rows={4}
            className="form-textarea"
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
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="loading-spinner"></div>
                Добавление...
              </>
            ) : (
              <>
                📨 Опубликовать
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({ content: '' });
              setFieldErrors({});
              setSubmitMessage('');
            }}
            className="btn btn-secondary sm:w-auto"
          >
            🧹 Очистить
          </button>
        </div>
      </form>
    </div>
  );
}