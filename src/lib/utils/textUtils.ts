/**
 * Утилиты для работы с текстом
 */

/**
 * Капитализирует первую букву строки
 * @param str - строка для капитализации
 * @returns строка с заглавной первой буквой
 */
export function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Капитализирует первую букву каждого слова
 * @param str - строка для капитализации
 * @returns строка с заглавными первыми буквами
 */
export function capitalizeWords(str: string): string {
  if (!str) return str;
  return str
    .split(' ')
    .map(word => capitalizeFirstLetter(word))
    .join(' ');
}

/**
 * Нормализует название продукта: капитализирует первую букву и обрезает пробелы
 * @param name - название продукта
 * @returns нормализованное название
 */
export function normalizeProductName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  return capitalizeFirstLetter(trimmed);
}
