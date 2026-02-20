'use client';

import { useState } from 'react';
import { Users, Plus, Minus } from 'lucide-react';
import { RecipeWithIngredients } from '@/types/recipe';
import { motion } from 'framer-motion';

interface RecipeScalerProps {
  recipe: RecipeWithIngredients;
  onScaleChange?: (scaleFactor: number) => void;
}

export default function RecipeScaler({ recipe, onScaleChange }: RecipeScalerProps) {
  const [servings, setServings] = useState(recipe.servings);
  const scaleFactor = servings / recipe.servings;

  const adjustServings = (delta: number) => {
    const newServings = Math.max(1, servings + delta);
    setServings(newServings);
    if (onScaleChange) {
      onScaleChange(newServings / recipe.servings);
    }
  };

  const resetServings = () => {
    setServings(recipe.servings);
    if (onScaleChange) {
      onScaleChange(1);
    }
  };

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-600" />
          <span className="text-sm font-medium text-gray-700">
            Количество порций:
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => adjustServings(-1)}
            className="p-1 rounded-lg hover:bg-orange-200 transition-colors"
            disabled={servings <= 1}
          >
            <Minus className="w-5 h-5 text-orange-600" />
          </button>

          <motion.span
            key={servings}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-xl font-bold text-orange-700 min-w-[3ch] text-center"
          >
            {servings}
          </motion.span>

          <button
            onClick={() => adjustServings(1)}
            className="p-1 rounded-lg hover:bg-orange-200 transition-colors"
          >
            <Plus className="w-5 h-5 text-orange-600" />
          </button>
        </div>
      </div>

      {scaleFactor !== 1 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-orange-200"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Масштаб: <span className="font-semibold">{scaleFactor.toFixed(2)}x</span>
            </span>
            <button
              onClick={resetServings}
              className="text-orange-600 hover:underline font-medium"
            >
              Вернуть оригинал
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function ScaledIngredient({
  quantity,
  unit,
  name,
  scaleFactor = 1,
}: {
  quantity: number;
  unit: string;
  name: string;
  scaleFactor?: number;
}) {
  const scaledQuantity = quantity * scaleFactor;
  const displayQuantity = scaledQuantity % 1 === 0 
    ? scaledQuantity.toString() 
    : scaledQuantity.toFixed(1);

  return (
    <div className="flex items-start gap-3">
      <div className="min-w-[80px]">
        <motion.span
          key={scaledQuantity}
          initial={{ scale: 1.2, color: '#ea580c' }}
          animate={{ scale: 1, color: '#000' }}
          className="font-semibold"
        >
          {displayQuantity} {unit}
        </motion.span>
      </div>
      <span className="text-gray-700">{name}</span>
    </div>
  );
}
