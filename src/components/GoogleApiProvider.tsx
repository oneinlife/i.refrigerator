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
    </GoogleApiContext.Provider>
  );
}
