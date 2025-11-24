import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { useSession, signOut } from '@booktractor/app/lib/auth-client';

type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const accentMap: Record<string, string> = {
  blue: 'bg-blue-600 hover:bg-blue-500 focus-visible:ring-blue-200',
  emerald: 'bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-emerald-200',
  slate: 'bg-slate-900 hover:bg-slate-800 focus-visible:ring-slate-200',
};

type PortalUserMenuProps = {
  accent?: keyof typeof accentMap;
  menuItems: MenuItem[];
};

export function PortalUserMenu({ accent = 'slate', menuItems }: PortalUserMenuProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  const initials =
    session?.user?.name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U';
  const avatarUrl = session?.user?.image || undefined;

  const handleSignOut = () => {
    signOut({
      query: {
        onSuccess: () => router.push('/auth/login'),
        onError: (ctx: { error: { message?: string } }) =>
          console.error(ctx.error.message || 'Failed to sign out'),
      },
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          'relative flex h-10 w-10 items-center justify-center rounded-full text-white font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 overflow-hidden',
          accentMap[accent] ?? accentMap.slate
        )}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt={session?.user?.name ?? 'Account avatar'} fill sizes="40px" className="object-cover" />
        ) : (
          initials
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-slate-200 bg-white shadow-xl z-50">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {session?.user?.name ?? 'Account'}
            </p>
            <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
          </div>
          <div className="border-t border-slate-100" />
          <div className="py-1 text-sm text-slate-700">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50"
                >
                  <Icon className="h-4 w-4 text-slate-400" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-slate-100" />
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

