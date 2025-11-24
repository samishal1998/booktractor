'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, User, LayoutDashboard, Tractor, PackageSearch } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSession, signOut } from '@booktractor/app/lib/auth-client';

export default function LandingNavbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="relative z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-semibold tracking-tight text-blue-700">
            Booktractor
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link href="/catalog" className="hover:text-slate-900">
              Catalog
            </Link>
            <Link href="/portal" className="hover:text-slate-900">
              Owner workspace
            </Link>
            <Link href="/client" className="hover:text-slate-900">
              Client portal
            </Link>
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {session ? <UserDropdown /> : <AuthButtons />}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 md:hidden"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-600 md:hidden">
          <div className="flex flex-col gap-3">
            <Link href="/catalog" className="hover:text-slate-900">
              Catalog
            </Link>
            <Link href="/portal" className="hover:text-slate-900">
              Owner workspace
            </Link>
            <Link href="/client" className="hover:text-slate-900">
              Client portal
            </Link>
            <div className="pt-2">{session ? <UserDropdown condensed /> : <AuthButtons stack />}</div>
          </div>
        </div>
      )}
    </header>
  );
}

function AuthButtons({ stack = false }: { stack?: boolean }) {
  return (
    <div className={cn('items-center gap-3', stack ? 'flex flex-col' : 'flex')}>
      <Button variant="ghost" asChild className="text-sm">
        <Link href="/auth/login">Log in</Link>
      </Button>
      <Button asChild className="text-sm">
        <Link href="/auth/register">Create account</Link>
      </Button>
    </div>
  );
}

function UserDropdown({ condensed = false }: { condensed?: boolean }) {
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

  const handleSignOut = () => {
    signOut({
      query: {
        onSuccess: () => router.refresh(),
        onError: (ctx: { error: { message?: string } }) =>
          console.error(ctx.error.message || 'Failed to sign out'),
      },
    });
  };

  if (condensed) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">Signed in</span>
        <Link href="/owner" className="flex items-center gap-2 text-blue-600">
          <LayoutDashboard className="h-4 w-4" />
          Owner portal
        </Link>
        <Link href="/client" className="flex items-center gap-2 text-emerald-600">
          <Tractor className="h-4 w-4" />
          Client portal
        </Link>
        <button
          type="button"
          className="flex items-center gap-2 text-left text-sm text-slate-600"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-semibold">
          {initials}
        </span>
        <div className="text-left">
          <p className="text-sm font-semibold leading-none text-slate-900">
            {session?.user?.name ?? 'Account'}
          </p>
          <p className="text-xs text-slate-500 leading-none">{session?.user?.email}</p>
        </div>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {session?.user?.name ?? 'Welcome back'}
            </p>
            <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
          </div>
          <div className="border-t border-slate-100" />
          <div className="py-1 text-sm text-slate-700">
            <Link href="/owner" className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50">
              <LayoutDashboard className="h-4 w-4 text-slate-400" />
              Owner portal
            </Link>
            <Link href="/client" className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50">
              <PackageSearch className="h-4 w-4 text-slate-400" />
              Client portal
            </Link>
            <Link href="/profile" className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50">
              <User className="h-4 w-4 text-slate-400" />
              Profile & docs
            </Link>
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

