'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Tractor,
  ClipboardList,
  CalendarCheck,
  Bell,
  Loader2,
  User,
  Settings,
} from 'lucide-react';
import { useSession } from '@booktractor/app/lib/auth-client';
import { PortalUserMenu } from '@/components/portal/user-menu';

const navigation = [
  { name: 'Dashboard', href: '/owner', icon: LayoutDashboard },
  { name: 'Equipment', href: '/owner/machines', icon: Tractor },
  { name: 'Bookings', href: '/owner/bookings', icon: ClipboardList },
  { name: 'Calendar', href: '/owner/calendar', icon: CalendarCheck },
];

function OwnerGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!isPending && !session) {
      router.push(`/auth/login?redirect=${encodeURIComponent('/owner')}`);
    }
  }, [isPending, session, router]);
  if (isPending) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
        <Loader2 className="mb-3 h-6 w-6 animate-spin" />
        Checking owner access…
      </div>
    );
  }
  if (!session) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
        <p className="text-sm">Redirecting to login…</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 min-w-[100vw]">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/" className="flex items-center px-2">
                <span className="text-2xl font-bold text-blue-600">Booktractor</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                  OWNER
                </span>
              </Link>

              <div className="hidden lg:ml-6 lg:flex lg:space-x-8 flex-wrap">
                {navigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/owner' && pathname?.startsWith(item.href));
                  const Icon = item.icon;

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
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full text-gray-400 hover:text-gray-500">
                <Bell className="h-5 w-5" />
              </button>
              <PortalUserMenu
                accent="blue"
                menuItems={[
                  { href: '/profile', label: 'Profile & settings', icon: User },
                  { href: '/owner/machines', label: 'Manage equipment', icon: Settings },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="lg:hidden border-t border-gray-200">
          <div className="flex overflow-x-auto">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/owner' && pathname?.startsWith(item.href));
              const Icon = item.icon;

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
                  <Icon className="mx-auto h-4 w-4" />
                  <div className="mt-1">{item.name}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main>
        <OwnerGuard>{children}</OwnerGuard>
      </main>
    </div>
  );
}
