'use client';

import { useEffect, useRef } from 'react';
import { storageService } from '@/lib/storageService';
import { getGoogleSheetsService } from '@/lib/clientGoogleSheets';
import type { InventoryItem, LegacyInventoryItem } from '@/types/inventory';

interface UseAutoSyncOptions {
  enabled: boolean;
  interval: number; // в минутах
  onSync: () => void;
}

// Временные функции конвертации между новым и старым форматом
// TODO: Обновить Google Sheets интеграцию для работы с новой структурой
function toLegacyFormat(item: InventoryItem): LegacyInventoryItem {
  return {
    id: item.inventory_id,
    name: item.product_id, // Используем ID продукта как временное имя
    quantity: item.quantity,
    unit: item.unit,
    category: 'Другое', // Категория больше не поддерживается
    expiryDate: item.expiry_date,
    addedDate: item.added_date,
    notes: item.notes,
  };
}

function fromLegacyFormat(legacy: LegacyInventoryItem): InventoryItem {
  return {
    inventory_id: legacy.id,
    product_id: legacy.name, // Это временное решение, нужна полная миграция
    quantity: legacy.quantity,
    unit: legacy.unit,
    expiry_date: legacy.expiryDate,
    added_date: legacy.addedDate,
    notes: legacy.notes,
  };
}

export function useAutoSync({ enabled, interval, onSync }: UseAutoSyncOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || interval <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const performSync = async () => {
      try {
        const service = getGoogleSheetsService();
        
        if (!service.isAuthenticated()) {
          console.log('Auto-sync skipped: not authenticated');
          return;
        }

        const spreadsheetId = storageService.getSpreadsheetId();
        const sheetName = storageService.getSheetName();

        if (!spreadsheetId) {
          console.log('Auto-sync skipped: spreadsheet ID not configured');
          return;
        }

        const localItems = storageService.getInventory();
        const legacyItems = localItems.map(toLegacyFormat);
        const syncedLegacyItems = await service.syncWithSheet(
          spreadsheetId,
          sheetName,
          legacyItems
        );

        const syncedItems = syncedLegacyItems.map(fromLegacyFormat);
        storageService.setInventory(syncedItems);
        console.log('Auto-sync successful:', syncedItems.length, 'items');
        onSync();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    };

    // Запускаем синхронизацию по интервалу
    intervalRef.current = setInterval(
      performSync,
      interval * 60 * 1000 // конвертируем минуты в миллисекунды
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, onSync]);
}
