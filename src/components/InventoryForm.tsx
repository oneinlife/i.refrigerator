'use client';

import { useState, useEffect } from 'react';
import type { CreateInventoryInput, InventoryItem } from '@/types/inventory';
import type { Product } from '@/types/product';
import { Unit } from '@/types/inventory';
import ProductAutocomplete from './ProductAutocomplete';
import { useProducts } from '@/hooks/useProducts';

interface InventoryFormProps {
  onSubmit: (item: CreateInventoryInput) => void;
  editItem?: InventoryItem | null;
  onProductCreated?: () => void;
}

export default function InventoryForm({ onSubmit, editItem, onProductCreated }: InventoryFormProps) {
  const { products, loading: productsLoading, getOrCreateProduct } = useProducts();
  
  // Для отображения в UI храним выбранный продукт
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState<CreateInventoryInput>({
    product_id: editItem?.product_id || '',
    quantity: editItem?.quantity || 1,
    unit: editItem?.unit || Unit.PCS,
    expiry_date: editItem?.expiry_date || '',
    notes: editItem?.notes || '',
  });

  // Загрузить данные о продукте при редактировании
  useEffect(() => {
    if (editItem && products.length > 0) {
      const product = products.find(p => p.product_id === editItem.product_id);
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [editItem, products]);

  // Автозаполнение данных при выборе продукта
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setFormData(prev => ({
      ...prev,
      product_id: product.product_id,
      unit: product.default_unit,
      // Автоматически установить срок годности, если указан типичный
      expiry_date: product.typical_shelf_life_days
        ? new Date(Date.now() + product.typical_shelf_life_days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
        : prev.expiry_date,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let productId = formData.product_id;
    let product = products.find(p => p.product_id === productId);

    // Если продукт не найден по ID, ищем по имени
    if (!product && selectedProduct?.name) {
      product = products.find(p => p.name.toLowerCase() === selectedProduct.name.toLowerCase());
      productId = product?.product_id || '';
    }

    // Если продукт не найден, создаём автоматически
    if (!product && selectedProduct?.name) {
      const newProduct = await getOrCreateProduct(selectedProduct.name, formData.unit);
      if (newProduct) {
        productId = newProduct.product_id;
        // Обновить список продуктов после создания
        onProductCreated?.();
      }
    }

    if (!productId) {
      alert('Не удалось определить продукт.');
      return;
    }

    onSubmit({ ...formData, product_id: productId });

    // Сбросить форму
    if (!editItem) {
      setSelectedProduct(null);
      setFormData({
        product_id: '',
        quantity: 1,
        unit: Unit.PCS,
        expiry_date: '',
        notes: '',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-4">
        {editItem ? 'Редактировать продукт' : 'Добавить продукт'}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Продукт *
            {productsLoading && (
              <span className="ml-2 text-xs text-gray-500">(загрузка справочника...)</span>
            )}
          </label>
          <ProductAutocomplete
            value={selectedProduct?.name || ''}
            onChange={(value) => {
              if (!value) {
                setSelectedProduct(null);
                setFormData({ ...formData, product_id: '' });
              } else {
                setSelectedProduct({
                  product_id: '',
                  name: value,
                  default_unit: formData.unit,
                  usage_count: 0,
                  created_date: new Date().toISOString(),
                });
                setFormData({ ...formData, product_id: '' });
              }
            }}
            onProductSelect={handleProductSelect}
            products={products}
            placeholder="Начните вводить название продукта..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Выберите продукт из справочника. Если продукта нет, сначала добавьте его в разделе &ldquo;📦 Справочник&rdquo;
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Новые продукты будут автоматически добавлены в справочник
          </p>
          {selectedProduct && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
              <span className="font-medium">{selectedProduct.name}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Количество *</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Единица измерения</label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          >
            {Object.entries(Unit).map(([key, value]) => (
              <option key={key} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Срок годности</label>
          <input
            type="date"
            value={formData.expiry_date}
            onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Примечания</label>
          <input
            type="text"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Дополнительная информация"
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-4 w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        {editItem ? 'Сохранить изменения' : 'Добавить'}
      </button>
    </form>
  );
}
