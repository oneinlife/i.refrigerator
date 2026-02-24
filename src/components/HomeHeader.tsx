import GoogleAuth from '@/components/GoogleAuth';
import NavLink from '@/components/NavLink';

type NavLinkConfig = {
  href: string;
  label: string;
  color: 'purple' | 'orange' | 'green' | 'blue' | 'gray';
};

const NAVIGATION_LINKS: NavLinkConfig[] = [
  { href: '/recipe-search', label: '🔍 Что приготовить?', color: 'purple' },
  { href: '/shopping-list', label: '🛒 Список покупок', color: 'orange' },
  { href: '/recipes', label: '🍳 Рецепты', color: 'green' },
  { href: '/products', label: '📦 Справочник', color: 'blue' },
  { href: '/settings', label: '⚙️ Настройки', color: 'gray' },
];

export default function HomeHeader() {
  return (
    <header className="mb-6 md:mb-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2">
            ❄️ i.refrigerator
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Управление инвентарем холодильника с синхронизацией в Google Sheets
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <GoogleAuth />
          {NAVIGATION_LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              color={link.color}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
