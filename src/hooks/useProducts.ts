'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Product, CreateProductInput } from '@/types/product';
import { getProductsSyncService } from '@/lib/googleSheets/productsSync';
import { storageService } from '@/lib/storageService';
import { useGoogleApi } from '@/components/GoogleApiProvider';

/**
 * Хук для работы с справочником продуктов
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated, isInitialized } = useGoogleApi();
  const productsService = useMemo(() => getProductsSyncService(), []);
  const spreadsheetId = storageService.getSpreadsheetId();

  /**
   * Загрузить все продукты
   */
  const loadProducts = useCallback(async () => {
    if (!spreadsheetId) {
      setError('Spreadsheet not configured');
      console.error('❌ Spreadsheet not configured');
      return;
    }

    console.log('🔄 Loading products from Google Sheets...');
    setLoading(true);
    setError(null);

    try {
      const data = await productsService.getAllProducts(spreadsheetId);
      console.log(`✅ Loaded ${data.length} products`);
      setProducts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load products';
      setError(message);
      console.error('❌ Failed to load products:', message);
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, productsService]);

  /**
   * Автозагрузка при монтировании и изменении авторизации
   */
  useEffect(() => {
    // Загружаем только если API инициализирован, пользователь авторизован и есть spreadsheetId
    if (spreadsheetId && isAuthenticated && isInitialized) {
      loadProducts();
    }
  }, [spreadsheetId, isAuthenticated, isInitialized, loadProducts]);

  /**
   * Добавить новый продукт
   */
  const addProduct = useCallback(async (input: CreateProductInput): Promise<Product | null> => {
    if (!spreadsheetId) {
      const msg = 'Не настроен ID таблицы. Перейдите в Настройки.';
      setError(msg);
      throw new Error(msg);
    }

    // Проверяем, готов ли API
    if (!productsService.isApiReady()) {
      const msg = 'Google Sheets API не инициализирован. Попробуйте обновить страницу.';
      setError(msg);
      throw new Error(msg);
    }

    setLoading(true);
    setError(null);

    try {
      const newProduct = await productsService.addProduct(spreadsheetId, input);
      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add product';
      setError(message);
      console.error('Failed to add product:', err);
      throw err; // Пробрасываем ошибку дальше
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, productsService]);

  /**
   * Обновить продукт
   */
  const updateProduct = useCallback(async (product: Product): Promise<boolean> => {
    if (!spreadsheetId) {
      setError('Spreadsheet not configured');
      return false;
    }

    // Проверяем, готов ли API
    if (!productsService.isApiReady()) {
      setError('Google Sheets API not initialized');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await productsService.updateProduct(spreadsheetId, product);
      if (success) {
        setProducts(prev => prev.map(p => p.product_id === product.product_id ? product : p));
      }
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update product';
      setError(message);
      console.error('Failed to update product:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, productsService]);

  /**
   * Удалить продукт
   */
  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    if (!spreadsheetId) {
      setError('Spreadsheet not configured');
      return false;
    }

    // Проверяем, готов ли API
    if (!productsService.isApiReady()) {
      setError('Google Sheets API not initialized');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await productsService.deleteProduct(spreadsheetId, productId);
      if (success) {
        setProducts(prev => prev.filter(p => p.product_id !== productId));
      }
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete product';
      setError(message);
      console.error('Failed to delete product:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, productsService]);

  /**
   * Поиск продуктов
   */
  const searchProducts = useCallback((query: string): Product[] => {
    const lowerQuery = query.toLowerCase().trim();
    
    if (!lowerQuery) {
      return products;
    }

    return products.filter(product => {
      // Поиск по имени
      if (product.name.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Поиск по алиасам
      if (product.aliases) {
        const aliases = product.aliases.toLowerCase().split(',');
        return aliases.some(alias => alias.trim().includes(lowerQuery));
      }
      
      return false;
    });
  }, [products]);

  /**
   * Найти продукт по имени (точное совпадение)
   */
  const findByName = useCallback((name: string): Product | null => {
    const lowerName = name.toLowerCase().trim();
    return products.find(p => p.name.toLowerCase() === lowerName) || null;
  }, [products]);

  /**
   * Получить продукт по ID
   */
  const getProductById = useCallback((productId: string): Product | null => {
    return products.find(p => p.product_id === productId) || null;
  }, [products]);

  /**
   * Получить или создать продукт
   */
  const getOrCreateProduct = useCallback(async (
    name: string,
    defaultUnit: string
  ): Promise<Product | null> => {
    // Попробовать найти существующий
    const existing = findByName(name);
    if (existing) {
      return existing;
    }

    // Создать новый
    return await addProduct({
      name,
      default_unit: defaultUnit,
      usage_count: 0,
    });
  }, [findByName, addProduct]);

  /**
   * Увеличить счетчик использования
   */
  const incrementUsageCount = useCallback(async (productId: string): Promise<void> => {
    const product = products.find(p => p.product_id === productId);
    if (!product) return;

    product.usage_count++;
    await updateProduct(product);
  }, [products, updateProduct]);

  /**
   * Получить наиболее используемые продукты
   */
  const getMostUsed = useCallback((limit: number = 10): Product[] => {
    return [...products]
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, limit);
  }, [products]);

  return {
    // Состояние
    products,
    loading,
    error,

    // Действия
    loadProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    findByName,
    getProductById,
    getOrCreateProduct,
    incrementUsageCount,
    getMostUsed,
  };
}
