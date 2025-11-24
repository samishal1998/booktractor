'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/owner', icon: '🏠' },
  { name: 'Equipment', href: '/owner/machines', icon: '🚜' },
  { name: 'Bookings', href: '/owner/bookings', icon: '📋' },
  { name: 'Calendar', href: '/owner/calendar', icon: '📊' },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <Link href="/owner" className="flex items-center px-2">
                <span className="text-2xl font-bold text-blue-600">
                  Booktractor
                </span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                  OWNER
                </span>
              </Link>

              {/* Navigation Links */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/owner' && pathname?.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right side - User menu */}
            <div className="flex items-center">
              <button className="p-2 rounded-full text-gray-400 hover:text-gray-500">
                🔔
              </button>
              <div className="ml-4 flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  O
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="sm:hidden border-t border-gray-200">
          <div className="flex overflow-x-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/owner' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex-1 px-4 py-3 text-center text-sm font-medium border-b-2 ${
                    isActive
                      ? 'border-blue-500 text-gray-900 bg-blue-50'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  <div>{item.icon}</div>
                  <div className="mt-1">{item.name}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
