'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Recipe } from '@/types/recipe';
import { Clock, Users, Tag, ChefHat } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  matchPercentage?: number;
  onDelete?: () => void;
}

export default function RecipeCard({ recipe, matchPercentage, onDelete }: RecipeCardProps) {
  const categories = recipe.categories.split(',').filter(Boolean);
  const tags = recipe.tags?.split(',').filter(Boolean) || [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
    >
      <Link href={`/recipes/${recipe.recipe_id}`}>
        <div className="relative">
          {recipe.image_url ? (
            <div className="relative w-full h-48">
              <Image
                src={recipe.image_url}
                alt={recipe.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
              <ChefHat className="w-16 h-16 text-orange-300" />
            </div>
          )}
          
          {matchPercentage !== undefined && (
            <div
              className={`absolute top-2 right-2 px-3 py-1 rounded-full text-white text-sm font-semibold ${
                matchPercentage >= 90
                  ? 'bg-green-500'
                  : matchPercentage >= 70
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
            >
              {matchPercentage}%
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 hover:text-orange-600 transition-colors">
            {recipe.name}
          </h3>
          
          {recipe.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {recipe.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{recipe.cooking_time} мин</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{recipe.servings} порций</span>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.slice(0, 3).map((category, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium"
                >
                  <Tag className="w-3 h-3" />
                  {category.trim()}
                </span>
              ))}
              {categories.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  +{categories.length - 3}
                </span>
              )}
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 4).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      {onDelete && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            className="w-full mt-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          >
            Удалить
          </button>
        </div>
      )}
    </motion.div>
  );
}
