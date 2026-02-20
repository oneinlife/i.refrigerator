'use client';

import { useGoogleApi } from '@/components/GoogleApiProvider';
import Link from 'next/link';

/**
 * Компонент отображает статус Google API и предложение авторизоваться
 */
export default function GoogleApiStatus() {
  const { isAuthenticated, isInitializing, isInitialized, error } = useGoogleApi();

  // Если авторизован и API готов - не показываем ничего
  if (isAuthenticated && isInitialized) {
    return null;
  }

  // Если загружается
  if (isInitializing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-blue-700">
          <span className="animate-spin">⏳</span>
          <span className="text-sm">Инициализация Google Sheets API...</span>
        </div>
      </div>
    );
  }

  // Если не авторизован
  if (!isAuthenticated) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 mb-1">
              Требуется авторизация в Google
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Для работы с рецептами и синхронизации данных необходимо авторизоваться в Google.
            </p>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
            >
              Перейти на главную для авторизации
            </Link>
            {error && (
              <p className="text-xs text-red-600 mt-2">
                Ошибка: {error}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
