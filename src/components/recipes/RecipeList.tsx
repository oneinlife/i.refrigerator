'use client';

import { motion } from 'framer-motion';
import { Recipe } from '@/types/recipe';
import RecipeCard from './RecipeCard';

interface RecipeListProps {
  recipes: Recipe[];
  loading?: boolean;
  onDelete?: (recipeId: string) => void;
}

export default function RecipeList({ recipes, loading, onDelete }: RecipeListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-xl h-80" />
          </div>
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <p className="text-gray-500 text-lg">Рецептов пока нет</p>
        <p className="text-gray-400 mt-2">Добавьте свой первый рецепт!</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
    >
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.recipe_id}
          recipe={recipe}
          onDelete={onDelete ? () => onDelete(recipe.recipe_id) : undefined}
        />
      ))}
    </motion.div>
  );
}
