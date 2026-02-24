'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storageService } from '@/lib/storageService';
import { getGoogleSheetsService } from '@/lib/clientGoogleSheets';
import { logError } from '@/lib/errorLogger';

interface GoogleApiContextType {
  isAuthenticated: boolean;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const GoogleApiContext = createContext<GoogleApiContextType>({
  isAuthenticated: false,
  isInitialized: false,
  isInitializing: false,
  error: null,
  signIn: async () => {},
  signOut: () => {},
});

export function useGoogleApi() {
  return useContext(GoogleApiContext);
}

export default function GoogleApiProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeGoogleApi = useCallback(async () => {
    if (isInitialized || isInitializing) return true;

    const clientId = storageService.getGoogleClientId();
    if (!clientId) {
      // Не выбрасываем ошибку, просто возвращаем false
      console.warn('Google Client ID не настроен. Перейдите в настройки.');
      return false;
    }

    console.log('🔄 Initializing Google Sheets API...');
    setIsInitializing(true);
    try {
      const service = getGoogleSheetsService();
      await service.initialize(clientId);
      console.log('✅ Google Sheets API initialized');
      setIsInitialized(true);
      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Ошибка инициализации Google API';
      setError(errorMsg);
      console.error('❌ API initialization error:', errorMsg);
      logError('GoogleApiProvider.initialize', err);
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [isInitialized, isInitializing]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const clientId = storageService.getGoogleClientId();
      if (!clientId) return;

      try {
        // Всегда пытаемся инициализировать API, если есть Client ID
        if (!isInitialized && !isInitializing) {
          await initializeGoogleApi();
        }
        
        const service = getGoogleSheetsService();
        const authenticated = service.isAuthenticated();
        
        // Проверяем, не истек ли токен
        if (authenticated && storageService.isGoogleTokenExpired()) {
          console.log('⚠️ Token expired, attempting silent refresh...');
          try {
            // Пытаемся автоматически обновить токен
            await service.refreshTokenSilently();
            console.log('✅ Token successfully refreshed');
            setIsAuthenticated(true);
            setError(null);
          } catch (refreshError) {
            console.warn('⚠️ Failed to refresh token automatically:', refreshError);
            // Только если не удалось обновить - показываем сообщение
            setIsAuthenticated(false);
            setError('Сессия истекла. Пожалуйста, войдите снова.');
          }
          return;
        }
        
        if (authenticated) {
          console.log('✅ Authenticated with Google');
        }
        setIsAuthenticated(authenticated);
      } catch (err) {
        console.error('❌ Auth check error:', err);
        logError('GoogleApiProvider.checkAuthStatus', err);
      }
    };
    
    checkAuthStatus();
    
    // Проверяем токен каждые 5 минут
    const interval = setInterval(checkAuthStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isInitialized, isInitializing, initializeGoogleApi]);

  const signIn = useCallback(async () => {
    setError(null);

    try {
      // Инициализируем API если еще не инициализирован
      const initialized = await initializeGoogleApi();
      if (!initialized) {
        throw new Error('Не удалось инициализировать Google API. Проверьте настройки.');
      }

      // Запрашиваем авторизацию
      const service = getGoogleSheetsService();
      return new Promise<void>((resolve, reject) => {
        service.authenticate((success, errorMsg) => {
          if (success) {
            setIsAuthenticated(true);
            setError(null);
            resolve();
          } else {
            const errMsg = errorMsg || 'Ошибка авторизации';
            setError(errMsg);
            setIsAuthenticated(false);
            reject(new Error(errMsg));
          }
        });
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Ошибка авторизации';
      setError(errorMsg);
      setIsAuthenticated(false);
      throw err;
    }
  }, [initializeGoogleApi]);

  const signOut = useCallback(() => {
    try {
      const service = getGoogleSheetsService();
      service.revokeToken();
      setIsAuthenticated(false);
      setError(null);
    } catch (err: any) {
      const errorMsg = err.message || 'Ошибка выхода';
      setError(errorMsg);
      logError('GoogleApiProvider.signOut', err);
    }
  }, []);

  const value: GoogleApiContextType = {
    isAuthenticated,
    isInitialized,
    isInitializing,
    error,
    signIn,
    signOut,
  };

  return (
    <GoogleApiContext.Provider value={value}>
      {children}
      {/* Уведомление об истечении сессии */}
      {error && error.includes('истекла') && (
        <div className="fixed bottom-4 right-4 max-w-md bg-yellow-50 border border-yellow-300 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-800">Сессия истекла</h3>
              <p className="text-sm text-yellow-700 mt-1">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  signIn();
                }}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition text-sm font-medium"
              >
                Войти снова
              </button>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-yellow-600 hover:text-yellow-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </GoogleApiContext.Provider>
  );
}
