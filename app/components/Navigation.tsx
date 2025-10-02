'use client';

import { useState, useEffect } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase/firebase';
import Link from 'next/link';

export default function Navigation() {
  const [user, setUser] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3">
                BB
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">Best Blog</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Главная
            </Link>
            
            {user ? (
              <>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 max-w-32 truncate">
                      {user.displayName || user.email}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Выйти
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link 
                  href="/auth" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Войти
                </Link>
                <Link 
                  href="/auth" 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-blue-600 focus:outline-none focus:text-blue-600 transition-colors"
              aria-label="Открыть меню"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              <Link 
                href="/" 
                className="block text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Главная
              </Link>
              
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center px-3 py-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700">
                      {user.displayName || user.email}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left text-red-600 hover:text-red-800 px-3 py-2 rounded-md text-base font-medium transition-colors"
                  >
                    Выйти
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link 
                    href="/auth" 
                    className="block text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Войти
                  </Link>
                  <Link 
                    href="/auth" 
                    className="block bg-blue-600 text-white px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 transition-colors mx-3"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Регистрация
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
