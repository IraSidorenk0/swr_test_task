'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import LoginForm from '../components/LoginForm';
import RegistrationForm from '../components/RegistrationForm';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        // Redirect to home if already authenticated
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSuccess = () => {
    router.push('/');
  };

  const switchToRegister = () => {
    setIsLogin(false);
  };

  const switchToLogin = () => {
    setIsLogin(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center card p-8 animate-fade-in">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Вы уже авторизованы</h2>
          <p className="text-gray-600 mb-6">Перенаправляем на главную страницу...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-6">
            SW
          </div>
          <h2 className="text-responsive-lg font-bold text-gray-900 mb-2">
            {isLogin ? '👋 Добро пожаловать!' : '🎉 Присоединяйтесь к нам!'}
          </h2>
          <p className="text-gray-600 text-sm">
            {isLogin ? 'Войдите в свой аккаунт для продолжения' : 'Создайте новый аккаунт за несколько секунд'}
          </p>
        </div>
        
        <div className="card p-8">
          {isLogin ? (
            <LoginForm 
              onSuccess={handleSuccess}
              onSwitchToRegister={switchToRegister}
            />
          ) : (
            <RegistrationForm 
              onSuccess={handleSuccess}
              onSwitchToLogin={switchToLogin}
            />
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Продолжая, вы соглашаетесь с нашими условиями использования
          </p>
        </div>
      </div>
    </div>
  );
}

