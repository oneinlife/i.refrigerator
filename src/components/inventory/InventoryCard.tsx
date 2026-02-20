'use client';

import { motion } from 'framer-motion';
import { Package, Calendar, AlertCircle } from 'lucide-react';
import { InventoryItemWithProduct } from '@/types/inventory';
import { format, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';

interface InventoryCardProps {
  item: InventoryItemWithProduct;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function InventoryCard({ item, onEdit, onDelete }: InventoryCardProps) {
  const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null;
  const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, new Date()) : null;
  
  const getExpiryStatus = () => {
    if (!daysUntilExpiry) return 'good';
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 3) return 'critical';
    if (daysUntilExpiry <= 7) return 'warning';
    return 'good';
  };

  const status = getExpiryStatus();
  const statusColors = {
    expired: 'bg-red-50 border-red-200',
    critical: 'bg-orange-50 border-orange-200',
    warning: 'bg-yellow-50 border-yellow-200',
    good: 'bg-white border-gray-200',
  };

  const badgeColors = {
    expired: 'bg-red-100 text-red-700',
    critical: 'bg-orange-100 text-orange-700',
    warning: 'bg-yellow-100 text-yellow-700',
    good: 'bg-green-100 text-green-700',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      className={`rounded-lg border-2 p-4 shadow-sm hover:shadow-md transition-all ${statusColors[status]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{item.product.name}</h3>
            <p className="text-sm text-gray-500">{item.product.category}</p>
          </div>
        </div>
        
        {status !== 'good' && (
          <AlertCircle className={`w-5 h-5 ${status === 'expired' ? 'text-red-500' : 'text-orange-500'}`} />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Количество:</span>
          <span className="font-medium text-gray-900">
            {item.quantity} {item.unit}
          </span>
        </div>

        {expiryDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Годен до:
            </span>
            <span className={`text-sm font-medium px-2 py-1 rounded ${badgeColors[status]}`}>
              {format(expiryDate, 'd MMM yyyy', { locale: ru })}
              {daysUntilExpiry !== null && daysUntilExpiry >= 0 && (
                <span className="ml-1">({daysUntilExpiry}д)</span>
              )}
            </span>
          </div>
        )}

        {item.notes && (
          <p className="text-xs text-gray-500 mt-2 italic">{item.notes}</p>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Изменить
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Удалить
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
