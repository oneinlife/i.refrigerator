/**
 * Утилита для улучшенного логирования ошибок
 */

/**
 * Форматирует ошибку для вывода в консоль с полной информацией
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.message}\nStack: ${error.stack || 'No stack trace'}`;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

/**
 * Логирует ошибку с контекстом
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, formatError(error));
  
  // Дополнительно выводим сам объект ошибки для расширенной отладки
  if (error instanceof Error) {
    console.error('Error object:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else {
    console.error('Error value:', error);
  }
}

/**
 * Создает сообщение об ошибке для пользователя
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unknown error occurred';
}
