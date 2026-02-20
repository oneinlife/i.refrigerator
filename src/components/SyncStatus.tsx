'use client';

import { useState, useEffect } from 'react';
import { getSyncManager, SyncStatus as SyncStatusEnum } from '@/lib/syncManager';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface SyncStatusProps {
  /** Показывать детальную информацию */
  detailed?: boolean;
  
  /** Класс для стилизации */
  className?: string;
}

/**
 * Компонент отображения статуса синхронизации
 * Показывает иконку, статус и время последней синхронизации
 */
export default function SyncStatus({ detailed = false, className = '' }: SyncStatusProps) {
  const syncManager = getSyncManager();
  const [status, setStatus] = useState<SyncStatusEnum>(syncManager.getStatus());
  const [lastSyncTime, setLastSyncTime] = useState<number>(syncManager.getLastSyncTime());
  const [cacheSize, setCacheSize] = useState<string>(syncManager.getCacheSize());

  // Подписка на изменения статуса
  useEffect(() => {
    const unsubscribe = syncManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setLastSyncTime(syncManager.getLastSyncTime());
      setCacheSize(syncManager.getCacheSize());
    });

    return unsubscribe;
  }, [syncManager]);

  // Обновлять время каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSyncTime(syncManager.getLastSyncTime());
    }, 60000); // каждую минуту

    return () => clearInterval(interval);
  }, [syncManager]);

  // Получить иконку и цвет статуса
  const getStatusInfo = () => {
    switch (status) {
      case SyncStatusEnum.SYNCING:
        return {
          icon: '🔄',
          text: 'Синхронизация...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        };
      case SyncStatusEnum.SUCCESS:
        return {
          icon: '✅',
          text: 'Синхронизировано',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case SyncStatusEnum.ERROR:
        return {
          icon: '❌',
          text: 'Ошибка синхронизации',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      case SyncStatusEnum.OFFLINE:
        return {
          icon: '📡',
          text: 'Оффлайн режим',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
      default:
        return {
          icon: '⚪',
          text: 'Готов',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Форматировать время последней синхронизации
  const getLastSyncText = () => {
    if (lastSyncTime === 0) {
      return 'Никогда';
    }

    try {
      return formatDistanceToNow(lastSyncTime, {
        addSuffix: true,
        locale: ru,
      });
    } catch {
      return 'Недавно';
    }
  };

  if (!detailed) {
    // Компактный режим (только иконка и статус)
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bgColor} ${statusInfo.borderColor} border ${className}`}
        title={`Синхронизация ${getLastSyncText()}`}
      >
        <span className={status === SyncStatusEnum.SYNCING ? 'animate-spin' : ''}>
          {statusInfo.icon}
        </span>
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>
    );
  }

  // Детальный режим
  return (
    <div
      className={`flex flex-col gap-2 p-4 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border ${className}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-2xl ${status === SyncStatusEnum.SYNCING ? 'animate-spin' : ''}`}
        >
          {statusInfo.icon}
        </span>
        <div className="flex-1">
          <div className={`font-semibold ${statusInfo.color}`}>
            {statusInfo.text}
          </div>
          <div className="text-xs text-gray-600">
            Последняя синхронизация: {getLastSyncText()}
          </div>
        </div>
      </div>

      {/* Дополнительная информация */}
      {syncManager.hasCachedData() && (
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
          <div className="flex justify-between">
            <span>Размер кэша:</span>
            <span className="font-medium">{cacheSize}</span>
          </div>
          {syncManager.isCacheExpired() && (
            <div className="text-amber-600 mt-1">
              ⚠️ Кэш устарел, рекомендуется синхронизация
            </div>
          )}
        </div>
      )}

      {/* Статус оффлайн */}
      {status === SyncStatusEnum.OFFLINE && (
        <div className="text-xs text-gray-600 pt-2 border-t border-gray-200">
          Приложение работает в оффлайн-режиме. Данные будут синхронизированы при
          восстановлении соединения.
        </div>
      )}
    </div>
  );
}
