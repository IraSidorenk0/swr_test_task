'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from 'firebase/auth';
import { z } from 'zod';
import { db, auth } from '../../firebase/firebase';
import { Post, LoginFormData, RegistrationFormData, PostFormData } from '../types';
import PostForm from './PostForm';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchPosts, updatePost, deletePost, toggleLike, fetchLikedStates, optimisticToggleLike, revertOptimisticLike } from '../../store/slices/postsSlice';

// Zod schemas for validation
const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email обязателен')
    .email('Введите корректный email'),
  password: z.string()
    .min(1, 'Пароль обязателен')
    .min(6, 'Пароль должен содержать минимум 6 символов')
});

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

export default function PostList() {
  const dispatch = useAppDispatch();
  const { posts, likedPostIds, loading, error } = useAppSelector((state) => state.posts);
  
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editData, setEditData] = useState<PostFormData>({ title: '', content: '', tags: [], likes: 0 });
  const [editErrors, setEditErrors] = useState<Record<string, string | undefined>>({});
  const [isEditing, setIsEditing] = useState(false);
  // Filters
  const [authorFilter, setAuthorFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [appliedAuthorFilter, setAppliedAuthorFilter] = useState<string>('');
  const [appliedTagFilter, setAppliedTagFilter] = useState<string>('');
  
  // Authentication states
  const [user, setUser] = useState<any>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  
  // Form data states
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState<RegistrationFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });


  // Fetch posts on component mount and when applied filters change
  useEffect(() => {
    dispatch(fetchPosts({ authorFilter: appliedAuthorFilter, tagFilter: appliedTagFilter }));
  }, [dispatch, appliedAuthorFilter, appliedTagFilter]);

  // Authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setShowLoginForm(false);
        setShowRegisterForm(false);
        setSubmitMessage('');
        // Refresh liked states when user logs in
        if (posts.length > 0) {
          dispatch(fetchLikedStates({ posts, userId: currentUser.uid }));
        }
      }
    });

    return () => unsubscribe();
  }, [dispatch, posts]);

  // Handle post creation success
  const handlePostCreated = () => {
    console.log('🎉 Post creation successful! Refreshing posts list...');
    setShowPostForm(false);
    // Posts will be automatically updated via Redux state
  };


  const beginEditPost = (post: Post) => {
    if (!user) return;
    if (post.authorId !== user.uid) return;
    setEditingPostId(post.id);
    setEditData({
      title: post.title,
      content: post.content,
      tags: Array.isArray(post.tags) ? post.tags : [],
      likes: typeof post.likes === 'number' ? post.likes : 0
    });
    setEditErrors({});
  };

  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditErrors({});
    setIsEditing(false);
  };

  const submitEditPost = async (postId: string) => {
    if (!user) return;
    setIsEditing(true);
    setEditErrors({});
    try {
      const cleanedTags = (editData.tags || []).map(t => (t ?? '').trim()).filter(t => t.length > 0);
      if (!editData.title || editData.title.trim().length < 5) {
        setEditErrors(prev => ({ ...prev, title: 'Минимум 5 символов' }));
        setIsEditing(false);
        return;
      }
      if (!editData.content || editData.content.trim().length < 10) {
        setEditErrors(prev => ({ ...prev, content: 'Минимум 10 символов' }));
        setIsEditing(false);
        return;
      }
      if (cleanedTags.length === 0) {
        setEditErrors(prev => ({ ...prev, tags: 'Добавьте хотя бы один тег' }));
        setIsEditing(false);
        return;
      }

      const updates = {
        title: editData.title.trim(),
        content: editData.content.trim(),
        tags: cleanedTags,
        likes: Math.max(0, Number(editData.likes || 0)),
      };

      await dispatch(updatePost({ postId, updates })).unwrap();
      setEditingPostId(null);
    } catch (e) {
      console.error('Error updating post:', e);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (!user) return;
    if (post.authorId !== user.uid) return;
    const confirmed = window.confirm('Удалить этот пост? Это действие необратимо.');
    if (!confirmed) return;
    try {
      await dispatch(deletePost(post.id)).unwrap();
      if (editingPostId === post.id) cancelEditPost();
    } catch (e) {
      console.error('Error deleting post:', e);
    }
  };

  const handleToggleLike = async (post: Post) => {
    if (!user) {
      alert('Войдите, чтобы поставить лайк.');
      return;
    }
    const userId = user.uid;
    const isLiked = likedPostIds.includes(post.id);
    const increment = isLiked ? -1 : 1;
    
    // Optimistic update
    dispatch(optimisticToggleLike({ postId: post.id, increment, isLiked: !isLiked }));
    
    try {
      await dispatch(toggleLike({ postId: post.id, userId, isLiked })).unwrap();
    } catch (e) {
      console.error('Error toggling like:', e);
      // Revert optimistic update on failure
      dispatch(revertOptimisticLike({ postId: post.id, increment, isLiked: !isLiked }));
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Дата неизвестна';
    
    try {
      // Handle Firebase Timestamp
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      // Handle regular Date
      return new Date(timestamp).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Дата неизвестна';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Загрузка постов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Ошибка подключения к Firebase</h2>
          <p className="mb-4">Не удалось загрузить посты: {error}</p>
          <div className="text-sm text-gray-600 bg-gray-100 p-4 rounded-lg">
            <p className="font-semibold mb-2">Возможные причины:</p>
            <ul className="text-left space-y-1">
              <li>• Проверьте настройки Firebase Security Rules</li>
              <li>• Убедитесь, что Firestore Database инициализирован</li>
              <li>• Проверьте подключение к интернету</li>
            </ul>
            <p className="mt-2 text-xs">
              См. файл FIREBASE_SETUP_GUIDE.md для подробных инструкций
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Попробовать снова
            </button>
            <button
              onClick={() => dispatch(fetchPosts({ authorFilter: appliedAuthorFilter, tagFilter: appliedTagFilter }))}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Обновить
            </button>
          </div>
        </div>
      </div>
    );
  }
  const loginToSite = () => {
    setShowLoginForm(true);
    setShowRegisterForm(false);
    setSubmitMessage('');
    setFieldErrors({});
  }

  const registerToSite = () => {
    setShowRegisterForm(true);
    setShowLoginForm(false);
    setSubmitMessage('');
    setFieldErrors({});
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');
    setFieldErrors({});

    try {
      const parsed = loginSchema.safeParse(loginData);
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
      
      // Clear form data
      setLoginData({ email: '', password: '' });
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

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');
    setFieldErrors({});

    try {
      const parsed = registrationSchema.safeParse(registerData);
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
      
      // Clear form data
      setRegisterData({ email: '', password: '', confirmPassword: '', displayName: '' });
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSubmitMessage('Вы вышли из системы');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  const closeAuthForms = () => {
    setShowLoginForm(false);
    setShowRegisterForm(false);
    setSubmitMessage('');
    setFieldErrors({});
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Блог посты</h1>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-gray-600 mr-2">
                Привет, {user.displayName || user.email}!
              </span>
              <button
                onClick={() => setShowPostForm(!showPostForm)}
                className="bg-blue-600 text-sm text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {showPostForm ? 'Скрыть форму' : 'Создать новый пост'}
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white text-sm px-6 py-2 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <button
                onClick={loginToSite}
                className="bg-blue-600 text-sm text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Войти
              </button>
              <button
                onClick={registerToSite}
                className="bg-green-600 text-sm text-white px-6 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                Регистрация
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Автор</label>
            <input
              type="text"
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              placeholder="Имя автора"
              className="w-full h-8 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Тег</label>
            <input
              type="text"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="Напр. react"
              className="w-full h-8 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                setAppliedAuthorFilter(authorFilter.trim());
                setAppliedTagFilter(tagFilter.trim());
              }}
              className="px-4 py-2 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Применить
            </button>
            <button
              onClick={() => { 
                setAuthorFilter(''); 
                setTagFilter(''); 
                setAppliedAuthorFilter('');
                setAppliedTagFilter('');
              }}
              className="px-4 py-2 text-xs bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Сбросить
            </button>
          </div>
        </div>
        {(authorFilter || tagFilter) && (
          <div className="mt-2 text-sm text-gray-600">Фильтры активны</div>
        )}
      </div>

      {/* Post Form */}
      {showPostForm && (
        <div className="mb-8">
          <PostForm onSuccess={handlePostCreated} />
        </div>
      )}

      {/* Login Form */}
      {showLoginForm && (
        <div className="mb-8">
          <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Вход в систему</h2>
              <button
                onClick={closeAuthForms}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  type="email"
                  id="login-email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите ваш email..."
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Пароль *
                </label>
                <input
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  type="password"
                  id="login-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите ваш пароль..."
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              {/* Submit Message */}
              {submitMessage && (
                <div className={`p-3 rounded-md ${
                  submitMessage.includes('Успешный') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {submitMessage}
                </div>
              )}

              {/* Buttons */}
              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Вход...' : 'Войти'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginForm(false);
                    setShowRegisterForm(true);
                  }}
                  className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Нет аккаунта? Зарегистрироваться
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registration Form */}
      {showRegisterForm && (
        <div className="mb-8">
          <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Регистрация</h2>
              <button
                onClick={closeAuthForms}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Display Name */}
              <div>
                <label htmlFor="register-displayName" className="block text-sm font-medium text-gray-700 mb-1">
                  Имя пользователя *
                </label>
                <input
                  value={registerData.displayName}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, displayName: e.target.value }))}
                  type="text"
                  id="register-displayName"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите ваше имя..."
                />
                {fieldErrors.displayName && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.displayName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  value={registerData.email}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                  type="email"
                  id="register-email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите ваш email..."
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Пароль *
                </label>
                <input
                  value={registerData.password}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                  type="password"
                  id="register-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите пароль (минимум 6 символов)..."
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="register-confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Подтвердите пароль *
                </label>
                <input
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  type="password"
                  id="register-confirmPassword"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Подтвердите пароль..."
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Message */}
              {submitMessage && (
                <div className={`p-3 rounded-md ${
                  submitMessage.includes('успешно') 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {submitMessage}
                </div>
              )}

              {/* Buttons */}
              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterForm(false);
                    setShowLoginForm(true);
                  }}
                  className="w-full bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Уже есть аккаунт? Войти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-6">
        {!posts || posts.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl text-gray-600 mb-2">Пока нет постов</h2>
            <p className="text-gray-500">Создайте первый пост, чтобы начать!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              {/* Post Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    <Link href={`/posts/${post.id}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </h2>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <button
                      type="button"
                      onClick={() => { setAuthorFilter(post.authorName || ''); setAppliedAuthorFilter(post.authorName || ''); }}
                      className="text-left hover:underline"
                    >
                      👤 {post.authorName}
                    </button>
                    <span>📅 {formatDate(post.createdAt)}</span>
                    <span>❤️ {post.likes}</span>
                  </div>
                </div>
                {user && user.uid === post.authorId && (
                  <div className="flex gap-2">
                    {editingPostId === post.id ? (
                      <>
                        <button
                          onClick={() => submitEditPost(post.id)}
                          disabled={isEditing}
                          className="bg-green-600  text-xs text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={cancelEditPost}
                          className="bg-gray-500 text-xs text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                        >
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => beginEditPost(post)}
                          className="bg-yellow-500 text-xs text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeletePost(post)}
                          className="bg-red-600 text-xs text-white px-4 py-2 rounded-lg hover:bg-red-700"
                        >
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                )}
                {/* Like Button */}
                <div className="ml-4">
                  <button
                    onClick={() => handleToggleLike(post)}
                    className={`text-xs px-3 py-1 rounded-full ${likedPostIds.includes(post.id) ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-pink-100 text-pink-700 hover:bg-pink-200'}`}
                  >
                    {likedPostIds.includes(post.id) ? '💗 Лайкнуто' : '❤️ Лайк'}
                  </button>
                </div>
              </div>

              {/* Post Content or Edit Form */}
              {editingPostId === post.id ? (
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок *</label>
                    <input
                      value={editData.title}
                      onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Введите заголовок"
                    />
                    {editErrors.title && (<p className="mt-1 text-sm text-red-600">{editErrors.title}</p>)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Текст *</label>
                    <textarea
                      value={editData.content}
                      onChange={(e) => setEditData(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Введите текст поста"
                    />
                    {editErrors.content && (<p className="mt-1 text-sm text-red-600">{editErrors.content}</p>)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Теги (через запятую) *</label>
                    <input
                      value={(editData.tags || []).join(', ')}
                      onChange={(e) => {
                        const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                        setEditData(prev => ({ ...prev, tags }));
                      }}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="tag1, tag2"
                    />
                    {editErrors.tags && (<p className="mt-1 text-sm text-red-600">{editErrors.tags}</p>)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Лайки</label>
                    <input
                      value={editData.likes}
                      onChange={(e) => {
                        const num = Number(e.target.value);
                        setEditData(prev => ({ ...prev, likes: Number.isFinite(num) && num >= 0 ? num : 0 }));
                      }}
                      type="number"
                      min="0"
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="prose max-w-none mb-4 max-h-[150px] overflow-hidden relative">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white"></div>
                </div>
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => { setTagFilter(tag); setAppliedTagFilter(tag); }}
                      className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full hover:bg-blue-200"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Open Post */}
              <div className="mt-4">
                <Link
                  href={`/posts/${post.id}`}
                  className="inline-block text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Открыть пост
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}