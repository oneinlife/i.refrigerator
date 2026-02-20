'use client';

import { useState, useEffect } from 'react';
import { storageService } from '@/lib/storageService';
import { getGoogleSheetsService } from '@/lib/clientGoogleSheets';
import { logError } from '@/lib/errorLogger';
import Link from 'next/link';

export default function SettingsPage() {
  const [clientId, setClientId] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Inventory');
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(5);
  const [saved, setSaved] = useState(false);
  const [canCreateSheet, setCanCreateSheet] = useState(false);

  useEffect(() => {
    loadSettings();
    checkAuth();
  }, []);

  const loadSettings = () => {
    setClientId(storageService.getGoogleClientId() || '');
    setSpreadsheetId(storageService.getSpreadsheetId() || '');
    setSheetName(storageService.getSheetName());
    setAutoSync(storageService.getAutoSync());
    setSyncInterval(storageService.getSyncInterval());
  };

  const checkAuth = () => {
    const service = getGoogleSheetsService();
    setCanCreateSheet(service.isAuthenticated());
  };

  const handleSave = () => {
    storageService.setGoogleClientId(clientId);
    storageService.setSpreadsheetId(spreadsheetId);
    storageService.setSheetName(sheetName);
    storageService.setAutoSync(autoSync);
    storageService.setSyncInterval(syncInterval);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCreateSheet = async () => {
    try {
      const service = getGoogleSheetsService();
      const newSpreadsheetId = await service.createSpreadsheet('i.refrigerator Inventory');
      setSpreadsheetId(newSpreadsheetId);
      alert(`✅ Таблица создана!\n\nID: ${newSpreadsheetId}\n\nНе забудьте нажать "💾 Сохранить настройки"`);
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      let errorMessage = 'Ошибка создания таблицы: ' + errorMsg;
      
      if (errorMsg.includes('not initialized') || errorMsg.includes('not ready')) {
        errorMessage += '\n\n💡 Попробуйте:\n• Перезагрузить страницу (F5)\n• Подождать 2-3 секунды и попробовать снова';
      } else if (errorMsg.includes('Not authenticated')) {
        errorMessage += '\n\n💡 Сначала вернитесь на главную страницу и нажмите "Войти через Google"';
      }
      
      alert(errorMessage);
      logError('SettingsPage.handleCreateSheet', error);
    }
  };

  const handleClearAll = () => {
    if (confirm('Вы уверены? Это удалит ВСЕ данные и настройки!')) {
      storageService.clearAll();
      loadSettings();
      alert('Все данные удалены');
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
            ← Назад к инвентарю
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ⚙️ Настройки
          </h1>
          <p className="text-gray-600">
            Конфигурация приложения и интеграции с Google Sheets
          </p>
        </header>

        <div className="space-y-6">
          {/* Google OAuth настройки */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Google OAuth 2.0</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Client ID *
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="123456789-abcdefg.apps.googleusercontent.com"
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Получите Client ID в{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google Cloud Console
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Google Sheets настройки */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Google Sheets</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Spreadsheet ID *
                </label>
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4"
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ID из URL таблицы: docs.google.com/spreadsheets/d/<strong>[ID]</strong>/edit
                </p>
              </div>

              <div>
                <button
                  onClick={handleCreateSheet}
                  disabled={!canCreateSheet}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-sm"
                  title={!canCreateSheet ? 'Сначала авторизуйтесь' : ''}
                >
                  📄 Создать новую таблицу
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Название листа
                </label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="Inventory"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Автосинхронизация */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Автоматическая синхронизация</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoSync"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="autoSync" className="text-sm font-medium">
                  Включить автоматическую синхронизацию
                </label>
              </div>

              {autoSync && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Интервал синхронизации (минуты)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(parseInt(e.target.value) || 5)}
                    className="w-32 px-3 py-2 border rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              💾 Сохранить настройки
            </button>

            <button
              onClick={handleClearAll}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
            >
              🗑️ Очистить все данные
            </button>
          </div>

          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">✅ Настройки сохранены!</p>
            </div>
          )}
        </div>

        {/* Инструкция */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">
            📋 Как настроить Google OAuth
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>
              Перейдите в{' '}
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                Google Cloud Console
              </a>
            </li>
            <li>Создайте новый проект или выберите существующий</li>
            <li>Включите <strong>Google Sheets API</strong></li>
            <li>
              Перейдите в <strong>APIs & Services → Credentials</strong>
            </li>
            <li>Нажмите <strong>Create Credentials → OAuth client ID</strong></li>
            <li>
              Выберите тип: <strong>Web application</strong>
            </li>
            <li>
              Добавьте Authorized JavaScript origins:
              <code className="block bg-white px-2 py-1 mt-1 rounded">
                http://localhost:3000
              </code>
            </li>
            <li>Скопируйте <strong>Client ID</strong> и вставьте выше</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
