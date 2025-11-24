'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  PackageSearch,
  ClipboardList,
  Bell,
  UserRound,
  Loader2,
  User,
} from 'lucide-react';
import { useSession } from '@booktractor/app/lib/auth-client';
import { PortalUserMenu } from '@/components/portal/user-menu';

const navigation = [
  { name: 'Overview', href: '/client', icon: Home },
  { name: 'Catalog', href: '/client/machines', icon: PackageSearch },
  { name: 'Bookings', href: '/client/bookings', icon: ClipboardList },
];

function ClientGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push(`/auth/login?redirect=${encodeURIComponent('/client')}`);
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
        <Loader2 className="mb-3 h-6 w-6 animate-spin" />
        Checking client access…
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

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/" className="flex items-center px-2">
                <span className="text-2xl font-bold text-emerald-600">Booktractor</span>
                <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
                  CLIENT
                </span>
              </Link>

              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/client' && pathname?.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-emerald-500 text-slate-900'
                          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
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
              <button className="p-2 rounded-full text-slate-400 hover:text-slate-600">
                <Bell className="h-5 w-5" />
              </button>
              <PortalUserMenu
                accent="emerald"
                menuItems={[
                  { href: '/profile', label: 'Profile & settings', icon: User },
                  { href: '/client/bookings', label: 'Manage bookings', icon: UserRound },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="sm:hidden border-t border-slate-200">
          <div className="flex overflow-x-auto">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/client' && pathname?.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex-1 px-4 py-3 text-center text-sm font-medium border-b-2 ${
                    isActive
                      ? 'border-emerald-500 text-slate-900 bg-emerald-50'
                      : 'border-transparent text-slate-500'
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
        <ClientGuard>{children}</ClientGuard>
      </main>
    </div>
  );
}
