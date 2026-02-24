/**
 * Утилита для конвертации единиц измерения
 * Базовые единицы:
 * - Вес: граммы (г)
 * - Объем: миллилитры (мл)
 * - Штуки: штуки (шт)
 */

export enum UnitType {
  WEIGHT = 'weight',
  VOLUME = 'volume',
  PIECE = 'piece',
  UNKNOWN = 'unknown'
}

export interface UnitConversion {
  baseUnit: string;
  toBase: number; // множитель для конвертации в базовую единицу
}

/**
 * Справочник единиц измерения и их конвертация в базовые единицы
 */
const UNIT_MAPPINGS: Record<string, UnitConversion> = {
  // Вес (базовая единица - грамм)
  'г': { baseUnit: 'г', toBase: 1 },
  'грамм': { baseUnit: 'г', toBase: 1 },
  'граммов': { baseUnit: 'г', toBase: 1 },
  'кг': { baseUnit: 'г', toBase: 1000 },
  'килограмм': { baseUnit: 'г', toBase: 1000 },
  'килограммов': { baseUnit: 'г', toBase: 1000 },
  
  // Объем (базовая единица - миллилитр)
  'мл': { baseUnit: 'мл', toBase: 1 },
  'миллилитр': { baseUnit: 'мл', toBase: 1 },
  'миллилитров': { baseUnit: 'мл', toBase: 1 },
  'л': { baseUnit: 'мл', toBase: 1000 },
  'литр': { baseUnit: 'мл', toBase: 1000 },
  'литров': { baseUnit: 'мл', toBase: 1000 },
  
  // Штуки
  'шт': { baseUnit: 'шт', toBase: 1 },
  'штук': { baseUnit: 'шт', toBase: 1 },
  'штука': { baseUnit: 'шт', toBase: 1 },
  'пучок': { baseUnit: 'шт', toBase: 1 },
  'пучка': { baseUnit: 'шт', toBase: 1 },
  'пучков': { baseUnit: 'шт', toBase: 1 },
  
  // Кулинарные меры (приблизительная конвертация)
  'ст.л.': { baseUnit: 'мл', toBase: 15 },
  'ст. л.': { baseUnit: 'мл', toBase: 15 },
  'столовая ложка': { baseUnit: 'мл', toBase: 15 },
  'столовых ложек': { baseUnit: 'мл', toBase: 15 },
  'ч.л.': { baseUnit: 'мл', toBase: 5 },
  'ч. л.': { baseUnit: 'мл', toBase: 5 },
  'чайная ложка': { baseUnit: 'мл', toBase: 5 },
  'чайных ложек': { baseUnit: 'мл', toBase: 5 },
  'стакан': { baseUnit: 'мл', toBase: 250 },
  'стакана': { baseUnit: 'мл', toBase: 250 },
  'стаканов': { baseUnit: 'мл', toBase: 250 },
};

/**
 * Нормализовать строку единицы измерения
 */
function normalizeUnitString(unit: string): string {
  return unit.toLowerCase().trim();
}

/**
 * Получить информацию о конвертации для единицы измерения
 */
function getUnitConversion(unit: string): UnitConversion | null {
  const normalized = normalizeUnitString(unit);
  return UNIT_MAPPINGS[normalized] || null;
}

/**
 * Определить тип единицы измерения
 */
export function getUnitType(unit: string): UnitType {
  const conversion = getUnitConversion(unit);
  if (!conversion) return UnitType.UNKNOWN;
  
  if (conversion.baseUnit === 'г') return UnitType.WEIGHT;
  if (conversion.baseUnit === 'мл') return UnitType.VOLUME;
  if (conversion.baseUnit === 'шт') return UnitType.PIECE;
  
  return UnitType.UNKNOWN;
}

/**
 * Конвертировать количество в базовую единицу измерения
 * @param quantity - количество
 * @param unit - единица измерения
 * @returns объект с количеством в базовой единице и названием базовой единицы
 */
export function convertToBaseUnit(
  quantity: number,
  unit: string
): { quantity: number; unit: string } {
  const conversion = getUnitConversion(unit);
  
  if (!conversion) {
    // Если единица неизвестна, возвращаем как есть
    console.warn(`Unknown unit: ${unit}, returning as-is`);
    return { quantity, unit };
  }
  
  return {
    quantity: quantity * conversion.toBase,
    unit: conversion.baseUnit
  };
}

/**
 * Конвертировать количество из одной единицы в другую
 * @param quantity - количество
 * @param fromUnit - исходная единица
 * @param toUnit - целевая единица
 * @returns количество в целевой единице или null если конвертация невозможна
 */
export function convertUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const fromConversion = getUnitConversion(fromUnit);
  const toConversion = getUnitConversion(toUnit);
  
  // Если хотя бы одна единица неизвестна
  if (!fromConversion || !toConversion) {
    return null;
  }
  
  // Проверяем, что единицы одного типа
  if (fromConversion.baseUnit !== toConversion.baseUnit) {
    console.warn(`Cannot convert between different unit types: ${fromUnit} -> ${toUnit}`);
    return null;
  }
  
  // Конвертируем через базовую единицу
  const baseQuantity = quantity * fromConversion.toBase;
  const targetQuantity = baseQuantity / toConversion.toBase;
  
  return targetQuantity;
}

/**
 * Проверить, совместимы ли две единицы измерения (одного типа)
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const conv1 = getUnitConversion(unit1);
  const conv2 = getUnitConversion(unit2);
  
  if (!conv1 || !conv2) return false;
  
  return conv1.baseUnit === conv2.baseUnit;
}

/**
 * Сравнить два количества в разных единицах измерения
 * @returns положительное число если quantity1 > quantity2,
 *          отрицательное если quantity1 < quantity2,
 *          0 если равны,
 *          null если сравнение невозможно
 */
export function compareQuantities(
  quantity1: number,
  unit1: string,
  quantity2: number,
  unit2: string
): number | null {
  // Конвертируем оба значения в первую базовую единицу
  const base1 = convertToBaseUnit(quantity1, unit1);
  const base2 = convertToBaseUnit(quantity2, unit2);
  
  // Проверяем совместимость единиц
  if (base1.unit !== base2.unit) {
    console.warn(`Cannot compare incompatible units: ${unit1} (${base1.unit}) vs ${unit2} (${base2.unit})`);
    return null;
  }
  
  return base1.quantity - base2.quantity;
}

/**
 * Проверить, достаточно ли имеющегося количества для требуемого
 * @param availableQuantity - имеющееся количество
 * @param availableUnit - единица имеющегося количества
 * @param requiredQuantity - требуемое количество
 * @param requiredUnit - единица требуемого количества
 * @returns true если хватает, false если не хватает, null если сравнение невозможно
 */
export function hasEnoughQuantity(
  availableQuantity: number,
  availableUnit: string,
  requiredQuantity: number,
  requiredUnit: string
): boolean | null {
  const comparison = compareQuantities(
    availableQuantity,
    availableUnit,
    requiredQuantity,
    requiredUnit
  );
  
  if (comparison === null) return null;
  
  return comparison >= 0;
}

/**
 * Получить отображаемую единицу измерения (для UI)
 * Конвертирует большие значения базовых единиц в более крупные для удобства
 */
export function getDisplayUnit(quantity: number, baseUnit: string): { quantity: number; unit: string } {
  // Для весов: если >= 1000г, показываем в кг
  if (baseUnit === 'г' && quantity >= 1000) {
    return {
      quantity: quantity / 1000,
      unit: 'кг'
    };
  }
  
  // Для объемов: если >= 1000мл, показываем в л
  if (baseUnit === 'мл' && quantity >= 1000) {
    return {
      quantity: quantity / 1000,
      unit: 'л'
    };
  }
  
  return { quantity, unit: baseUnit };
}

/**
 * Форматировать количество с единицей измерения для отображения
 */
export function formatQuantity(quantity: number, unit: string, useDisplayUnit = true): string {
  if (useDisplayUnit) {
    const base = convertToBaseUnit(quantity, unit);
    const display = getDisplayUnit(base.quantity, base.unit);
    return `${display.quantity} ${display.unit}`;
  }
  
  return `${quantity} ${unit}`;
}
