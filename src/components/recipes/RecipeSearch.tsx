'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, Clock, Filter, SlidersHorizontal } from 'lucide-react';
import { Recipe } from '@/types/recipe';
import { motion, AnimatePresence } from 'framer-motion';

interface RecipeSearchProps {
  recipes: Recipe[];
  onSearch: (filtered: Recipe[]) => void;
}

export default function RecipeSearch({ recipes, onSearch }: RecipeSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [maxCookingTime, setMaxCookingTime] = useState<number | null>(null);
  const [minServings, setMinServings] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('recipe-search-history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  // Save search to history
  const saveToHistory = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const newHistory = [
      searchQuery,
      ...searchHistory.filter((h) => h !== searchQuery),
    ].slice(0, 5);
    
    setSearchHistory(newHistory);
    localStorage.setItem('recipe-search-history', JSON.stringify(newHistory));
  };

  // Clear search history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('recipe-search-history');
  };

  // Get all unique categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    recipes.forEach((recipe) => {
      recipe.categories.split(',').forEach((cat) => {
        const trimmed = cat.trim();
        if (trimmed) cats.add(trimmed);
      });
    });
    return Array.from(cats).sort();
  }, [recipes]);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    let filtered = recipes;

    // Search by name, description, tags
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(lowerQuery) ||
          recipe.description?.toLowerCase().includes(lowerQuery) ||
          recipe.tags?.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((recipe) => {
        const recipeCats = recipe.categories
          .split(',')
          .map((c) => c.trim());
        return selectedCategories.some((cat) => recipeCats.includes(cat));
      });
    }

    // Filter by cooking time
    if (maxCookingTime) {
      filtered = filtered.filter(
        (recipe) => recipe.cooking_time <= maxCookingTime
      );
    }

    // Filter by servings
    if (minServings) {
      filtered = filtered.filter((recipe) => recipe.servings >= minServings);
    }

    return filtered;
  }, [recipes, query, selectedCategories, maxCookingTime, minServings]);

  useEffect(() => {
    onSearch(filteredRecipes);
  }, [filteredRecipes, onSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveToHistory(query);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const clearAllFilters = () => {
    setQuery('');
    setSelectedCategories([]);
    setMaxCookingTime(null);
    setMinServings(null);
  };

  const hasActiveFilters =
    query || selectedCategories.length > 0 || maxCookingTime || minServings;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию, описанию, тегам..."
            className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-orange-100 text-orange-600'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Search History */}
        {!query && searchHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-2"
          >
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs text-gray-500 font-medium">
                История поиска
              </span>
              <button
                onClick={clearHistory}
                className="text-xs text-red-600 hover:underline"
              >
                Очистить
              </button>
            </div>
            {searchHistory.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(item);
                  saveToHistory(item);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{item}</span>
              </button>
            ))}
          </motion.div>
        )}
      </form>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Фильтры
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-orange-600 hover:underline"
                  >
                    Сбросить все
                  </button>
                )}
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Категории
                </label>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedCategories.includes(category)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cooking Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Максимальное время приготовления (минут)
                </label>
                <input
                  type="number"
                  value={maxCookingTime || ''}
                  onChange={(e) =>
                    setMaxCookingTime(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  placeholder="Любое"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Servings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Минимум порций
                </label>
                <input
                  type="number"
                  value={minServings || ''}
                  onChange={(e) =>
                    setMinServings(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  placeholder="Любое"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Найдено рецептов: <span className="font-semibold">{filteredRecipes.length}</span>
        </span>
        {hasActiveFilters && (
          <span className="text-orange-600">
            Применены фильтры
          </span>
        )}
      </div>
    </div>
  );
}
