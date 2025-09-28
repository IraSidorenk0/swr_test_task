'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase/firebase';

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
    }),
  likes: z.number()
    .int('Количество лайков должно быть целым числом')
    .min(0, 'Количество лайков не может быть отрицательным')
    .default(0) 
});

type PostFormData = z.infer<typeof postSchema>;

export default function PostForm() {
  const [user, loading, error] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema) ,
    defaultValues: {
      tags: [],
      likes: 0 
    }
  });

  const watchedTags = watch('tags');

  const addTag = () => {
    const currentTags = watchedTags || [];
    if (currentTags.length < 10) {
      setValue('tags', [...currentTags, '']);
    }
  };

  const removeTag = (index: number) => {
    const currentTags = watchedTags || [];
    setValue('tags', currentTags.filter((_, i) => i !== index));
  };

  const updateTag = (index: number, value: string) => {
    const currentTags = watchedTags || [];
    const newTags = [...currentTags];
    newTags[index] = value;
    setValue('tags', newTags);
  };

  const onSubmit = async (data: PostFormData) => {
    if (!user) {
      setSubmitMessage('Ошибка: Пользователь не авторизован');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const postData = {
        ...data,
        authorId: user.uid,
        authorName: user.displayName || user.email || 'Анонимный пользователь',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        tags: data.tags.filter(tag => tag.trim() !== '')
      };

      await addDoc(collection(db, 'posts'), postData);
      
      setSubmitMessage('Пост успешно создан!');
      reset();
    } catch (error) {
      console.error('Ошибка при создании поста:', error);
      setSubmitMessage('Ошибка при создании поста. Попробуйте снова.');
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

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Создать новый пост
      </h1>
      
      <form onSubmit={handleSubmit(onSubmit as SubmitHandler<PostFormData>)} className="space-y-6">
        {/* Заголовок поста */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Заголовок поста *
          </label>
          <input
            {...register('title')}
            type="text"
            id="title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Введите заголовок поста..."
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Основной текст поста */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Основной текст поста *
          </label>
          <textarea
            {...register('content')}
            id="content"
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Введите основной текст поста..."
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
          )}
        </div>

        {/* Теги */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Теги * (минимум 1, максимум 10)
          </label>
          <div className="space-y-2">
            {watchedTags?.map((tag, index) => (
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
            {(!watchedTags || watchedTags.length < 10) && (
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Добавить тег
              </button>
            )}
          </div>
          {errors.tags && (
            <p className="mt-1 text-sm text-red-600">{errors.tags.message}</p>
          )}
        </div>

        {/* Количество лайков (опционально) */}
        <div>
          <label htmlFor="likes" className="block text-sm font-medium text-gray-700 mb-2">
            Количество лайков (опционально)
          </label>
          <input
            {...register('likes', { valueAsNumber: true })}
            type="number"
            id="likes"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
          />
          {errors.likes && (
            <p className="mt-1 text-sm text-red-600">{errors.likes.message}</p>
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
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Создание...' : 'Создать пост'}
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Очистить
          </button>
        </div>
      </form>
    </div>
  );
}