'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from 'firebase/auth';
import { z } from 'zod';
import { auth } from '../../firebase/firebase';
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
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <h2 className="text-responsive-lg font-bold text-gray-900">Последние посты</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {user ? (
            <>
              <span className="text-gray-600 mr-2">
                Привет, {user.displayName || user.email}!
              </span>
              <button
                onClick={() => setShowPostForm(!showPostForm)}
                className="btn btn-primary w-full sm:w-auto"
              >
                {showPostForm ? '📝 Скрыть форму' : '✍️ Создать пост'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={loginToSite}
                className="btn btn-primary w-full sm:w-auto"
              >
                🔐 Войти
              </button>
              <button
                onClick={registerToSite}
                className="btn btn-success w-full sm:w-auto"
              >
                📝 Регистрация
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6 mb-8 animate-slide-in">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          🔍 Фильтры
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="form-label">👤 Автор</label>
            <input
              type="text"
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              placeholder="Имя автора"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">#️⃣ Тег</label>
            <input
              type="text"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="Напр. react"
              className="form-input"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <button
              onClick={() => {
                setAppliedAuthorFilter(authorFilter.trim());
                setAppliedTagFilter(tagFilter.trim());
              }}
              className="btn btn-primary flex-1"
            >
              ✅ Применить
            </button>
            <button
              onClick={() => { 
                setAuthorFilter(''); 
                setTagFilter(''); 
                setAppliedAuthorFilter('');
                setAppliedTagFilter('');
              }}
              className="btn btn-outline flex-1"
            >
              🗑️ Сбросить
            </button>
          </div>
        </div>
        {(appliedAuthorFilter || appliedTagFilter) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-sm text-blue-800">
              <span className="mr-2">🎯</span>
              Активные фильтры:
              {appliedAuthorFilter && <span className="ml-2 px-2 py-1 bg-blue-100 rounded">Автор: {appliedAuthorFilter}</span>}
              {appliedTagFilter && <span className="ml-2 px-2 py-1 bg-blue-100 rounded">Тег: {appliedTagFilter}</span>}
            </div>
          </div>
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
        <div className="mb-8 animate-fade-in">
          <div className="max-w-md mx-auto card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-responsive-lg font-bold text-gray-900 flex items-center">
                🔐 Вход в систему
              </h2>
              <button
                onClick={closeAuthForms}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors"
                aria-label="Закрыть"
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
                  className="form-input"
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
                  className="form-input"
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
                  className="btn btn-primary w-full"
                >
                  {isSubmitting ? '🔄 Вход...' : '🔐 Войти'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginForm(false);
                    setShowRegisterForm(true);
                  }}
                  className="btn btn-secondary w-full"
                >
                  📝 Нет аккаунта? Зарегистрироваться
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registration Form */}
      {showRegisterForm && (
        <div className="mb-8 animate-fade-in">
          <div className="max-w-md mx-auto card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-responsive-lg font-bold text-gray-900 flex items-center">
                📝 Регистрация
              </h2>
              <button
                onClick={closeAuthForms}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors"
                aria-label="Закрыть"
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
                  className="btn btn-primary w-full"
                >
                  {isSubmitting ? '🔄 Регистрация...' : '🎉 Зарегистрироваться'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterForm(false);
                    setShowLoginForm(true);
                  }}
                  className="btn btn-secondary w-full"
                >
                  🔐 Уже есть аккаунт? Войти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-8">
        {!posts || posts.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-responsive-lg text-gray-600 mb-2">Пока нет постов</h2>
            <p className="text-gray-500 mb-6">Создайте первый пост, чтобы начать!</p>
            {user && (
              <button
                onClick={() => setShowPostForm(true)}
                className="btn btn-primary"
              >
                ✍️ Создать первый пост
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {posts.map((post) => (
              <article key={post.id} className="card card-hover p-6 animate-fade-in group">
                {/* Post Header */}
                <header className="mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    <Link href={`/posts/${post.id}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </h2>
                  <div className="flex flex-wrap items-center text-sm text-gray-500 gap-x-4 gap-y-2">
                    <button
                      type="button"
                      onClick={() => { setAuthorFilter(post.authorName || ''); setAppliedAuthorFilter(post.authorName || ''); }}
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2">
                        {post.authorName.charAt(0).toUpperCase()}
                      </div>
                      {post.authorName}
                    </button>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      {formatDate(post.createdAt)}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      {post.likes}
                    </span>
                  </div>
                </header>
                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleLike(post)}
                      className={`btn text-xs px-3 py-1 rounded-full transition-all ${likedPostIds.includes(post.id) ? 'bg-pink-600 text-white hover:bg-pink-700' : 'bg-pink-100 text-pink-700 hover:bg-pink-200'}`}
                    >
                      {likedPostIds.includes(post.id) ? '💗 Лайкнуто' : '❤️ Лайк'}
                    </button>
                  </div>
                  
                  {user && user.uid === post.authorId && (
                    <div className="flex gap-2">
                      {editingPostId === post.id ? (
                        <>
                          <button
                            onClick={() => submitEditPost(post.id)}
                            disabled={isEditing}
                            className="btn btn-success text-xs"
                          >
                            💾 Сохранить
                          </button>
                          <button
                            onClick={cancelEditPost}
                            className="btn btn-secondary text-xs"
                          >
                            ❌ Отмена
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => beginEditPost(post)}
                            className="btn btn-warning text-xs"
                          >
                            ✏️ Изменить
                          </button>
                          <button
                            onClick={() => handleDeletePost(post)}
                            className="btn btn-danger text-xs"
                          >
                            🗑️ Удалить
                          </button>
                        </>
                      )}
                    </div>
                  )}
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
                <div className="mb-4">
                  <div className="prose max-w-none max-h-32 overflow-hidden relative">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                      {post.content}
                    </p>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white"></div>
                  </div>
                </div>
              )}

                {/* Tags and Actions */}
                <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.slice(0, 3).map((tag, index) => (
                        <button
                          type="button"
                          key={index}
                          onClick={() => { setTagFilter(tag); setAppliedTagFilter(tag); }}
                          className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full hover:bg-blue-200 transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{post.tags.length - 3} еще
                        </span>
                      )}
                    </div>
                  )}

                  <Link
                    href={`/posts/${post.id}`}
                    className="btn btn-primary text-xs sm:text-sm flex items-center justify-center gap-2 hover:gap-3 transition-all"
                  >
                    Читать далее
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}