'use client';

import { useEffect, useRef } from 'react';
import { storageService } from '@/lib/storageService';
import { getGoogleSheetsService } from '@/lib/clientGoogleSheets';

interface UseAutoSyncOptions {
  enabled: boolean;
  interval: number; // в минутах
  onSync: () => void;
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
        const syncedItems = await service.syncWithSheet(
          spreadsheetId,
          sheetName,
          localItems
        );

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
