'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from 'firebase/auth';
import { z } from 'zod';
import { db, auth } from '../../firebase/firebase';
import { Post, LoginFormData, RegistrationFormData } from '../types';
import PostForm from './PostForm';

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
  const [showPostForm, setShowPostForm] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
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

  // Fetch posts function
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(postsQuery);
      
      const fetchedPosts: Post[] = [];
      querySnapshot.forEach((doc) => {
        fetchedPosts.push({
          id: doc.id,
          ...doc.data()
        } as Post);
      });
      
      setPosts(fetchedPosts);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch posts on component mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setShowLoginForm(false);
        setShowRegisterForm(false);
        setSubmitMessage('');
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle post creation success
  const handlePostCreated = () => {
    setShowPostForm(false);
    // Refresh posts after creating a new one
    fetchPosts();
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
          <p className="mb-4">Не удалось загрузить посты: {error.message}</p>
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
              onClick={fetchPosts}
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
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {showPostForm ? 'Скрыть форму' : 'Создать новый пост'}
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <button
                onClick={loginToSite}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Войти
              </button>
              <button
                onClick={registerToSite}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
              >
                Регистрация
              </button>
            </>
          )}
        </div>
      </div>

      {/* Post Form */}
      {showPostForm && (
        <div className="mb-8">
          <PostForm onSuccess={() => setShowPostForm(false)} />
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
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{post.title}</h2>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span>👤 {post.authorName}</span>
                    <span>📅 {formatDate(post.createdAt)}</span>
                    <span>❤️ {post.likes}</span>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div className="prose max-w-none mb-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}