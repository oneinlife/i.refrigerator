'use client';

/**
 * Стратегии разрешения конфликтов
 */
export enum ConflictStrategy {
  /** Последняя запись побеждает */
  LAST_WRITE_WINS = 'last_write_wins',
  
  /** Локальные данные имеют приоритет */
  LOCAL_WINS = 'local_wins',
  
  /** Удаленные данные имеют приоритет */
  REMOTE_WINS = 'remote_wins',
  
  /** Попытка слияния данных */
  MERGE = 'merge',
  
  /** Спросить пользователя */
  ASK_USER = 'ask_user',
}

/**
 * Информация о конфликте
 */
export interface Conflict<T> {
  /** ID элемента с конфликтом */
  id: string;
  
  /** Локальная версия */
  local: T;
  
  /** Удаленная версия */
  remote: T;
  
  /** Время последнего изменения локальной версии */
  localTimestamp?: number;
  
  /** Время последнего изменения удаленной версии */
  remoteTimestamp?: number;
  
  /** Тип конфликта */
  type: 'update' | 'delete' | 'create';
}

/**
 * Результат разрешения конфликта
 */
export interface ConflictResolution<T> {
  /** Разрешенное значение */
  resolved: T | null;
  
  /** Использованная стратегия */
  strategy: ConflictStrategy;
  
  /** Был ли конфликт разрешен */
  success: boolean;
  
  /** Сообщение об ошибке, если есть */
  error?: string;
}

/**
 * Сервис разрешения конфликтов при синхронизации
 */
export class ConflictResolver {
  private defaultStrategy: ConflictStrategy = ConflictStrategy.LAST_WRITE_WINS;

  /**
   * Установить стратегию по умолчанию
   */
  setDefaultStrategy(strategy: ConflictStrategy): void {
    this.defaultStrategy = strategy;
  }

  /**
   * Получить стратегию по умолчанию
   */
  getDefaultStrategy(): ConflictStrategy {
    return this.defaultStrategy;
  }

  /**
   * Разрешить конфликт с использованием заданной стратегии
   */
  resolve<T>(conflict: Conflict<T>, strategy?: ConflictStrategy): ConflictResolution<T> {
    const usedStrategy = strategy || this.defaultStrategy;

    try {
      switch (usedStrategy) {
        case ConflictStrategy.LAST_WRITE_WINS:
          return this.resolveLastWriteWins(conflict);
        
        case ConflictStrategy.LOCAL_WINS:
          return this.resolveLocalWins(conflict);
        
        case ConflictStrategy.REMOTE_WINS:
          return this.resolveRemoteWins(conflict);
        
        case ConflictStrategy.MERGE:
          return this.resolveMerge(conflict);
        
        case ConflictStrategy.ASK_USER:
          return this.resolveAskUser(conflict);
        
        default:
          return {
            resolved: null,
            strategy: usedStrategy,
            success: false,
            error: 'Неизвестная стратегия разрешения конфликтов',
          };
      }
    } catch (error) {
      return {
        resolved: null,
        strategy: usedStrategy,
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка разрешения конфликта',
      };
    }
  }

  /**
   * Стратегия: последняя запись побеждает
   */
  private resolveLastWriteWins<T>(conflict: Conflict<T>): ConflictResolution<T> {
    const localTime = conflict.localTimestamp || 0;
    const remoteTime = conflict.remoteTimestamp || 0;

    const resolved = localTime > remoteTime ? conflict.local : conflict.remote;

    return {
      resolved,
      strategy: ConflictStrategy.LAST_WRITE_WINS,
      success: true,
    };
  }

  /**
   * Стратегия: локальные данные побеждают
   */
  private resolveLocalWins<T>(conflict: Conflict<T>): ConflictResolution<T> {
    return {
      resolved: conflict.local,
      strategy: ConflictStrategy.LOCAL_WINS,
      success: true,
    };
  }

  /**
   * Стратегия: удаленные данные побеждают
   */
  private resolveRemoteWins<T>(conflict: Conflict<T>): ConflictResolution<T> {
    return {
      resolved: conflict.remote,
      strategy: ConflictStrategy.REMOTE_WINS,
      success: true,
    };
  }

  /**
   * Стратегия: попытка слияния данных
   * Объединяет поля из обеих версий
   */
  private resolveMerge<T>(conflict: Conflict<T>): ConflictResolution<T> {
    // Простое слияние объектов (приоритет у remote для конфликтующих полей)
    if (typeof conflict.local === 'object' && typeof conflict.remote === 'object') {
      const merged = {
        ...conflict.local,
        ...conflict.remote,
      } as T;

      return {
        resolved: merged,
        strategy: ConflictStrategy.MERGE,
        success: true,
      };
    }

    // Если не объекты, используем last-write-wins
    return this.resolveLastWriteWins(conflict);
  }

  /**
   * Стратегия: спросить пользователя
   * В веб-приложении можно использовать confirm или модальное окно
   */
  private resolveAskUser<T>(conflict: Conflict<T>): ConflictResolution<T> {
    if (typeof window === 'undefined') {
      // На сервере не можем спросить, используем last-write-wins
      return this.resolveLastWriteWins(conflict);
    }

    const message = `Обнаружен конфликт данных.\n\nВыберите версию:\nОК - Использовать локальную версию\nОтмена - Использовать удаленную версию`;
    
    const useLocal = window.confirm(message);

    return {
      resolved: useLocal ? conflict.local : conflict.remote,
      strategy: ConflictStrategy.ASK_USER,
      success: true,
    };
  }

  /**
   * Обнаружить конфликты между локальным и удаленным набором данных
   */
  detectConflicts<T extends { [key: string]: any }>(
    localItems: T[],
    remoteItems: T[],
    idField: keyof T = 'id' as keyof T,
    timestampField?: keyof T
  ): Conflict<T>[] {
    const conflicts: Conflict<T>[] = [];
    const remoteMap = new Map(remoteItems.map(item => [item[idField], item]));

    localItems.forEach(localItem => {
      const id = localItem[idField];
      const remoteItem = remoteMap.get(id);

      if (remoteItem) {
        // Проверить, есть ли различия
        const isDifferent = JSON.stringify(localItem) !== JSON.stringify(remoteItem);

        if (isDifferent) {
          conflicts.push({
            id: String(id),
            local: localItem,
            remote: remoteItem,
            localTimestamp: timestampField ? this.parseTimestamp(localItem[timestampField]) : undefined,
            remoteTimestamp: timestampField ? this.parseTimestamp(remoteItem[timestampField]) : undefined,
            type: 'update',
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Разрешить все конфликты
   */
  resolveAll<T>(
    conflicts: Conflict<T>[],
    strategy?: ConflictStrategy
  ): { resolved: T[]; errors: string[] } {
    const resolved: T[] = [];
    const errors: string[] = [];

    conflicts.forEach(conflict => {
      const resolution = this.resolve(conflict, strategy);
      
      if (resolution.success && resolution.resolved !== null) {
        resolved.push(resolution.resolved);
      } else if (resolution.error) {
        errors.push(`${conflict.id}: ${resolution.error}`);
      }
    });

    return { resolved, errors };
  }

  /**
   * Преобразовать значение в timestamp
   */
  private parseTimestamp(value: any): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date.getTime();
    }
    return undefined;
  }

  /**
   * Создать отчет о конфликтах
   */
  generateConflictReport<T>(conflicts: Conflict<T>[]): string {
    if (conflicts.length === 0) {
      return 'Конфликтов не обнаружено';
    }

    const lines = [
      `Обнаружено конфликтов: ${conflicts.length}`,
      '',
      'Детали:',
    ];

    conflicts.forEach((conflict, index) => {
      lines.push(`${index + 1}. ID: ${conflict.id}`);
      lines.push(`   Тип: ${conflict.type}`);
      if (conflict.localTimestamp) {
        lines.push(`   Локальное время: ${new Date(conflict.localTimestamp).toLocaleString()}`);
      }
      if (conflict.remoteTimestamp) {
        lines.push(`   Удаленное время: ${new Date(conflict.remoteTimestamp).toLocaleString()}`);
      }
      lines.push('');
    });

    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
let conflictResolver: ConflictResolver | null = null;

/**
 * Получить экземпляр разрешителя конфликтов
 */
export function getConflictResolver(): ConflictResolver {
  if (!conflictResolver) {
    conflictResolver = new ConflictResolver();
  }
  return conflictResolver;
}
