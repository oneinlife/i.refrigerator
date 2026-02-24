import Link from 'next/link';

type NavLinkColor = 'purple' | 'orange' | 'green' | 'blue' | 'gray';

interface NavLinkProps {
  href: string;
  label: string;
  color: NavLinkColor;
}

const colorClasses: Record<NavLinkColor, string> = {
  purple: 'bg-purple-200 text-purple-800 hover:bg-purple-300',
  orange: 'bg-orange-200 text-orange-800 hover:bg-orange-300',
  green: 'bg-green-200 text-green-800 hover:bg-green-300',
  blue: 'bg-blue-200 text-blue-800 hover:bg-blue-300',
  gray: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
};

export default function NavLink({ href, label, color }: NavLinkProps) {
  const baseClass = 'px-4 py-2 rounded transition text-center whitespace-nowrap font-medium';
  const colorClass = colorClasses[color];

  return (
    <Link href={href} className={`${baseClass} ${colorClass}`}>
      {label}
    </Link>
  );
}
