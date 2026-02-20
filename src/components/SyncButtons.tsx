'use client';

import { useState, useEffect } from 'react';
import { storageService } from '@/lib/storageService';
import { getSyncManager } from '@/lib/syncManager';
import { logError } from '@/lib/errorLogger';
import SyncStatus from './SyncStatus';
import Link from 'next/link';
import type { InventoryItem } from '@/types/inventory';

interface SyncButtonsProps {
  onSync: (items: InventoryItem[]) => void;
  items: InventoryItem[];
  isAuthenticated: boolean;
}

export default function SyncButtons({ onSync, items, isAuthenticated }: SyncButtonsProps) {
  const [syncing, setSyncing] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const syncManager = getSyncManager();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    setSpreadsheetId(storageService.getSpreadsheetId());
  };

  const handleSyncAll = async () => {
    if (!isAuthenticated) {
      alert('Сначала авторизуйтесь через Google');
      return;
    }

    if (!spreadsheetId) {
      alert('Настройте Spreadsheet ID в настройках');
      return;
    }

    setSyncing(true);
    try {
      const result = await syncManager.syncAll();
      
      if (result.success) {
        const messages = [];
        if (result.synced.products) messages.push(`Продукты: ${result.synced.products}`);
        if (result.synced.recipes) messages.push(`Рецепты: ${result.synced.recipes}`);
        if (result.synced.inventory) messages.push(`Инвентарь: ${result.synced.inventory}`);
        if (result.synced.shoppingList) messages.push(`Список покупок: ${result.synced.shoppingList}`);
        if (result.synced.categories) messages.push(`Категории: ${result.synced.categories}`);
        
        alert(`✅ Синхронизация завершена!\n\n${messages.join('\n')}`);
        
        // Перезагрузить инвентарь
        if (result.synced.inventory) {
          const cached = syncManager.loadFromCache();
          if (cached.inventory) {
            // Преобразуем InventoryItemWithProduct[] -> InventoryItem[]
            const inventoryItems: InventoryItem[] = cached.inventory.map(item => {
              const { product, ...inventoryItem } = item;
              return inventoryItem;
            });
            onSync(inventoryItems);
          }
        }
      } else {
        alert(`❌ Синхронизация завершена с ошибками:\n\n${result.errors.join('\n')}`);
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      alert('❌ Критическая ошибка синхронизации: ' + errorMsg);
      logError('SyncButtons.handleSyncAll', error);
    } finally {
      setSyncing(false);
    }
  };

  if (!storageService.isConfigured()) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          ⚠️ Google Sheets не настроен
        </h3>
        <p className="text-yellow-700 text-sm mb-3">
          Для синхронизации с Google таблицами необходимо настроить Client ID и Spreadsheet ID
        </p>
        <Link
          href="/settings"
          className="inline-block px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
        >
          ⚙️ Перейти в настройки
        </Link>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          🔐 Требуется авторизация
        </h3>
        <p className="text-blue-700 text-sm">
          Войдите через Google для синхронизации с таблицами
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Статус синхронизации */}
      <SyncStatus />

      {/* Кнопки синхронизации */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-semibold">Синхронизация с Google Sheets</h3>
            <p className="text-xs md:text-sm text-gray-600 mt-1 truncate">
              Таблица: <span className="font-mono text-xs">{spreadsheetId}</span>
            </p>
          </div>

          {/* Кнопка синхронизации всех модулей */}
          <div className="border-t pt-4">
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-sm font-semibold shadow-md"
            >
              {syncing ? '⏳ Синхронизация всех данных...' : '🔄 Синхронизировать все модули'}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Синхронизация продуктов, рецептов, инвентаря, списка покупок и категорий
            </p>
          </div>
        </div>
      </div>

      {storageService.getAutoSync() && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
          ℹ️ Автоматическая синхронизация включена (каждые {storageService.getSyncInterval()} мин)
        </div>
      )}
    </div>
  );
}
