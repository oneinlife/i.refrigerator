'use client';

import { useEffect, useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useRecipes } from '@/hooks/useRecipes';
import { useProducts } from '@/hooks/useProducts';
import { InventoryItemWithProduct } from '@/types/inventory';
import GoogleAuth from '@/components/GoogleAuth';
import AppLayout from '@/components/AppLayout';
import { FadeIn } from '@/components/ui/AnimatedComponents';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  Package,
  ChefHat,
  TrendingUp,
  Calendar,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import { differenceInDays } from 'date-fns';

export default function StatsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Only load data if authenticated
  const { inventory, loading: inventoryLoading, error: inventoryError } = useInventory();
  const { recipes, loading: recipesLoading, error: recipesError } = useRecipes();
  const { products, loading: productsLoading, error: productsError } = useProducts();

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRecipes: 0,
    expiringItems: 0,
    expiredItems: 0,
    mostUsedProducts: [] as Array<{ name: string; count: number }>,
    expiryTimeline: [] as Array<{ name: string; days: number }>,
  });

  useEffect(() => {
    if (!inventoryLoading && !recipesLoading && !productsLoading) {
      calculateStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory, recipes, products, inventoryLoading, recipesLoading, productsLoading]);

  const calculateStats = () => {
    // Total counts
    const totalProducts = products.length;
    const totalRecipes = recipes.length;

    // Expiry analysis
    const now = new Date();
    let expiringItems = 0;
    let expiredItems = 0;
    const expiryTimeline: Array<{ name: string; days: number }> = [];

    inventory.forEach((item: InventoryItemWithProduct) => {
      if (item.expiry_date) {
        const days = differenceInDays(new Date(item.expiry_date), now);
        if (days < 0) {
          expiredItems++;
        } else if (days <= 7) {
          expiringItems++;
          expiryTimeline.push({
            name: item.product.name,
            days,
          });
        }
      }
    });

    // Sort by days remaining
    expiryTimeline.sort((a, b) => a.days - b.days);

    // Most used products
    const productUsage = products
      .map((p) => ({ name: p.name, count: p.usage_count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setStats({
      totalProducts,
      totalRecipes,
      expiringItems,
      expiredItems,
      mostUsedProducts: productUsage,
      expiryTimeline,
    });
  };

  const loading = inventoryLoading || recipesLoading || productsLoading;
  const hasErrors = inventoryError || recipesError || productsError;

  // Show auth prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-orange-100 rounded-full">
              <LogIn className="w-12 h-12 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Войдите в свой аккаунт
            </h2>
            <p className="text-gray-600 max-w-md">
              Авторизуйтесь с помощью Google, чтобы увидеть статистику вашего холодильника
            </p>
          </div>
          
          <GoogleAuth onAuthChange={setIsAuthenticated} />
        </div>
      </AppLayout>
    );
  }

  // Show error if loading failed
  if (hasErrors && !loading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-500" />
          <h2 className="text-2xl font-bold text-gray-900">Ошибка загрузки данных</h2>
          <p className="text-gray-600 text-center max-w-md">
            {inventoryError || recipesError || productsError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Статистика</h1>
              <p className="text-gray-600 mt-2">
                Аналитика вашего холодильника и использования продуктов
              </p>
            </div>
            <div className="hidden sm:block">
              <GoogleAuth onAuthChange={setIsAuthenticated} />
            </div>
          </div>
        </FadeIn>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FadeIn delay={0.1}>
                <StatCard
                  title="Всего продуктов"
                  value={stats.totalProducts}
                  icon={Package}
                  color="blue"
                />
              </FadeIn>
              <FadeIn delay={0.2}>
                <StatCard
                  title="Рецептов"
                  value={stats.totalRecipes}
                  icon={ChefHat}
                  color="orange"
                />
              </FadeIn>
              <FadeIn delay={0.3}>
                <StatCard
                  title="Скоро истекут"
                  value={stats.expiringItems}
                  icon={Calendar}
                  color="yellow"
                />
              </FadeIn>
              <FadeIn delay={0.4}>
                <StatCard
                  title="Просрочено"
                  value={stats.expiredItems}
                  icon={AlertCircle}
                  color="red"
                />
              </FadeIn>
            </div>

            {/* Charts and Lists */}
            <div className="grid grid-cols-1 gap-6">
              {/* Most Used Products */}
              <FadeIn delay={0.5}>
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <h2 className="text-xl font-bold text-gray-900">
                      Популярные продукты
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {stats.mostUsedProducts.slice(0, 8).map((product, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                      >
                        <span className="text-gray-700">{product.name}</span>
                        <span className="text-sm font-medium text-gray-500">
                          {product.count} раз
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Expiry Timeline */}
            {stats.expiryTimeline.length > 0 && (
              <FadeIn delay={0.7}>
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <h2 className="text-xl font-bold text-gray-900">
                      График сроков годности
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {stats.expiryTimeline.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-orange-50"
                      >
                        <span className="text-gray-700">{item.name}</span>
                        <span
                          className={`text-sm font-medium px-3 py-1 rounded-full ${
                            item.days === 0
                              ? 'bg-red-100 text-red-700'
                              : item.days <= 3
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {item.days === 0
                            ? 'Сегодня'
                            : item.days === 1
                            ? 'Завтра'
                            : `${item.days} дней`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'orange' | 'yellow' | 'red';
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className={`inline-flex p-3 rounded-lg ${colors[color]} mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
