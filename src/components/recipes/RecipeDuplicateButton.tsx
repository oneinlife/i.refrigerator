'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Recipe } from '@/types/recipe';
import toast from 'react-hot-toast';
import { logError } from '@/lib/errorLogger';

interface RecipeDuplicateButtonProps {
  recipe: Recipe;
  onDuplicate: (recipe: Omit<Recipe, 'recipe_id' | 'created_date'>) => void;
}

export default function RecipeDuplicateButton({
  recipe,
  onDuplicate,
}: RecipeDuplicateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDuplicate = async () => {
    setIsLoading(true);
    try {
      const duplicatedRecipe = {
        name: `${recipe.name} (копия)`,
        description: recipe.description,
        servings: recipe.servings,
        cooking_time: recipe.cooking_time,
        categories: recipe.categories,
        instructions: recipe.instructions,
        image_url: recipe.image_url,
        tags: recipe.tags,
        last_used_date: undefined,
      };

      onDuplicate(duplicatedRecipe);
      toast.success('Рецепт продублирован!');
    } catch (error) {
      logError('RecipeDuplicateButton.handleDuplicate', error);
      toast.error('Не удалось продублировать рецепт');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDuplicate}
      disabled={isLoading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
    >
      <Copy className="w-4 h-4" />
      {isLoading ? 'Дублирование...' : 'Дублировать рецепт'}
    </button>
  );
}
