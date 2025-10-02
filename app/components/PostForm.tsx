'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, getConnectionStatus } from '../../firebase/firebase';
import { useAppDispatch } from '../../store/hooks';
import * as postsActions from '../../store/slices/postsSlice';

// Zod schema for post validation
const postSchema = z.object({
  title: z.string()
    .min(1, 'Заголовок поста обязателен')
    .min(5, 'Заголовок должен содержать минимум 5 символов')
    .max(100, 'Заголовок не должен превышать 100 символов'),
  content: z.string()
    .min(1, 'Основной текст поста обязателен')
    .min(10, 'Основной текст должен содержать минимум 10 символов')
    .max(5000, 'Основной текст не должен превышать 5000 символов'),
  tags: z.array(z.string())
    .min(1, 'Добавьте хотя бы один тег')
    .max(10, 'Максимум 10 тегов')
    .refine(tags => tags.every(tag => tag.trim().length > 0), {
      message: 'Теги не могут быть пустыми'
    })
});

type PostFormData = z.infer<typeof postSchema>;

interface PostFormProps {
  onSuccess?: () => void;
}

export default function PostForm({ onSuccess }: PostFormProps = {} as PostFormProps) {
  const dispatch = useAppDispatch();
  const [user, loading, error] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    content: '',
    tags: []
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      setIsOnline(getConnectionStatus());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const addTag = () => {
    if ((formData.tags?.length || 0) < 10) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), ''] }));
    }
  };

  const removeTag = (index: number) => {
    const currentTags = formData.tags || [];
    setFormData(prev => ({ ...prev, tags: currentTags.filter((_, i) => i !== index) }));
  };

  const updateTag = (index: number, value: string) => {
    const currentTags = formData.tags || [];
    const newTags = [...currentTags];
    newTags[index] = value;
    setFormData(prev => ({ ...prev, tags: newTags }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      setSubmitMessage('Ошибка: Пользователь не авторизован');
      return;
    }

    if (!isOnline) {
      setSubmitMessage('Ошибка: Нет подключения к интернету. Проверьте соединение.');
      return;
    }

    // Check if user token is still valid
    try {
      const token = await user.getIdToken(true); // Force refresh
      console.log('User token refreshed successfully');
    } catch (authError) {
      console.error('Token refresh failed:', authError);
      setSubmitMessage('Ошибка аутентификации. Пожалуйста, войдите в систему снова.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');
    setFieldErrors({});

    try {
      const dataToValidate: PostFormData = {
        title: formData.title,
        content: formData.content,
        tags: (formData.tags || []).map(t => (t == null ? '' : t))
      };

      const parsed = postSchema.safeParse(dataToValidate);
      if (!parsed.success) {
        const flat = parsed.error.flatten();
        setFieldErrors({
          title: flat.fieldErrors.title?.[0],
          content: flat.fieldErrors.content?.[0],
          tags: flat.fieldErrors.tags?.[0]
        });
        setIsSubmitting(false);
        return;
      }

      const validData = parsed.data;

      // Clean and validate tags
      const cleanedTags = validData.tags.filter(tag => tag.trim() !== '');
      if (cleanedTags.length === 0) {
        setFieldErrors({ tags: 'Добавьте хотя бы один тег' });
        setIsSubmitting(false);
        return;
      }

      const postData = {
        title: validData.title,
        content: validData.content,
        tags: cleanedTags,
        authorId: user.uid,
        authorName: user.displayName || user.email || 'Анонимный пользователь',
      };
      
      await dispatch(postsActions.createPost(postData));
      
      setSubmitMessage('Пост успешно создан!');
      setFormData({ title: '', content: '', tags: [] });
      setFieldErrors({});
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500); // Small delay to show success message
      }
    } catch (error: any) {
      console.error('=== POST CREATION ERROR ===');
      console.error('Full error object:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error stack:', error.stack);
      console.error('===========================');
      
      // More specific error messages
      let errorMessage = 'Ошибка при создании поста. Попробуйте снова.';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Ошибка доступа. Проверьте настройки Firebase Security Rules. Убедитесь, что правила опубликованы в Firebase Console.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Firebase недоступен. Проверьте подключение к интернету.';
      } else if (error.code === 'unauthenticated') {
        errorMessage = 'Ошибка аутентификации. Пожалуйста, войдите в систему снова.';
      } else if (error.code === 'invalid-argument') {
        errorMessage = 'Неверные данные. Проверьте правильность заполнения полей.';
      } else if (error.code === 'failed-precondition') {
        errorMessage = 'Ошибка предварительных условий. Попробуйте обновить страницу.';
      } else if (error.code === 'resource-exhausted') {
        errorMessage = 'Превышены лимиты Firebase. Попробуйте позже.';
      } else if (error.code === 'internal') {
        errorMessage = 'Внутренняя ошибка Firebase. Попробуйте позже.';
      } else if (error.message) {
        errorMessage = `Ошибка: ${error.message}`;
      }
      
      // Add debugging info to the error message in development
      if (process.env.NODE_ENV === 'development') {
        errorMessage += `\n\nDebug: ${error.code || 'unknown'} - ${error.message || 'no message'}`;
      }
      
      setSubmitMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">Ошибка авторизации: {error.message}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Авторизация необходима</h2>
          <p className="text-gray-600">Для создания поста необходимо войти в систему</p>
        </div>
      </div>
    );
  } 

   const createPost = () => {
    // Logic to open the PostForm modal or navigate to the PostForm page
    // setShowPostForm(true);
  }
  

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">

      <h3 className="text-3xl font-bold mb-6 text-center text-gray-800" onClick={createPost}>
        Создать новый пост
      </h3>        
      
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Заголовок поста */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Заголовок поста *
          </label>
          <input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            type="text"
            id="title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Введите заголовок поста..."
          />
          {fieldErrors.title && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>
          )}
        </div>

        {/* Основной текст поста */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Основной текст поста *
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            id="content"
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Введите основной текст поста..."
          />
          {fieldErrors.content && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.content}</p>
          )}
        </div>

        {/* Теги */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Теги * (минимум 1, максимум 10)
          </label>
          <div className="space-y-2">
            {formData.tags?.map((tag, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => updateTag(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Тег ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Удалить
                </button>
              </div>
            ))}
            {(!formData.tags || formData.tags.length < 10) && (
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-green-500 text-sm text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Добавить тег
              </button>
            )}
          </div>
          {fieldErrors.tags && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.tags}</p>
          )}
        </div>


        {/* Информация о пользователе */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Информация об авторе:</h3>
          <p className="text-sm text-gray-600">
            <strong>ID:</strong> {user.uid}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Имя:</strong> {user.displayName || user.email || 'Анонимный пользователь'}
          </p>
        </div>

        {/* Кнопки */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting || !isOnline}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Создание...' : !isOnline ? 'Нет подключения' : 'Создать пост'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({ title: '', content: '', tags: [] });
              setFieldErrors({});
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Очистить
          </button>
        </div>
      </form>
    </div>
  );
}