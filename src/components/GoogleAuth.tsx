'use client';

import { useState, useEffect } from 'react';
import { useGoogleApi } from '@/components/GoogleApiProvider';

interface GoogleAuthProps {
  onAuthChange?: (authenticated: boolean) => void;
}

export default function GoogleAuth({ onAuthChange }: GoogleAuthProps) {
  const { isAuthenticated, isInitializing, error: apiError, signIn, signOut } = useGoogleApi();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (onAuthChange) {
      onAuthChange(isAuthenticated);
    }
  }, [isAuthenticated, onAuthChange]);

  useEffect(() => {
    if (apiError) {
      setError(apiError);
    }
  }, [apiError]);

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      await signIn();
    } catch (err: any) {
      setError(err.message || 'Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    try {
      signOut();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка выхода');
    }
  };

  if (isAuthenticated) {
    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
          <span className="text-xs sm:text-sm text-gray-600">Авторизован в Google</span>
        </div>
        <button
          onClick={handleSignOut}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition whitespace-nowrap"
        >
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleSignIn}
        disabled={isLoading || isInitializing}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
      >
        {(isLoading || isInitializing) ? (
          <>
            <span className="animate-spin">⏳</span>
            {isInitializing ? 'Загрузка...' : 'Авторизация...'}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Войти через Google
          </>
        )}
      </button>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          ⚠️ {error}
          {error.includes('blocked') && (
            <div className="mt-1 text-xs">
              <strong>Решение:</strong> Разрешите всплывающие окна для этого сайта
            </div>
          )}
          {error.includes('настроен') && (
            <div className="mt-1 text-xs">
              <strong>Решение:</strong> Перейдите в <a href="/settings" className="underline">Настройки</a> и укажите Google Client ID
            </div>
          )}
        </div>
      )}
    </div>
  );
}
