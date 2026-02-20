'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Refrigerator } from 'lucide-react';
import Navigation from './Navigation';
import SyncStatus from './SyncStatus';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                <Refrigerator className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:inline">
                i.refrigerator
              </span>
            </Link>

            {/* Navigation */}
            <div className="flex items-center gap-4">
              <Navigation />
              <div className="hidden sm:block">
                <SyncStatus />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © 2026 i.refrigerator - Умный холодильник
          </p>
        </div>
      </footer>
    </div>
  );
}
