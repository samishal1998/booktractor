'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession, signIn } from '@booktractor/app/lib/auth-client';

export function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const redirectTo = searchParams?.get('redirect') || '/owner';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && session) {
      router.replace(redirectTo);
    }
  }, [isPending, session, redirectTo, router]);

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await signIn.email(
        { email, password },
        {
          onSuccess: () => router.push(redirectTo),
          onError: (ctx) => setError(ctx.error.message || 'Unable to sign in'),
        }
      );
    } catch (err) {
      console.error(err);
      setError('Unexpected error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await signIn.social(
        { provider: 'google' },
        {
          onSuccess: () => router.push(redirectTo),
          onError: (ctx) => setError(ctx.error.message || 'Google sign-in failed'),
        }
      );
    } catch (err) {
      console.error(err);
      setError('Unexpected error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 lg:flex-row">
      <section className="flex flex-1 flex-col justify-center bg-blue-900/95 px-8 py-16 text-white lg:px-16">
        <div className="mx-auto max-w-xl space-y-8">
          <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
            <Sparkles className="mr-2 h-4 w-4" />
            Trusted by modern rental teams
          </div>
          <div>
            <p className="text-sm tracking-wide text-blue-200 uppercase">BOOKTRACTOR</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight">
              The control tower for equipment rentals
            </h1>
            <p className="mt-4 text-lg text-blue-100">
              Manage availability, sync bookings, and keep clients updated—all from one owner
              workspace built for cross-platform workflows.
            </p>
          </div>
          <div className="grid gap-4 text-sm text-blue-100 md:grid-cols-2">
            <div className="rounded-lg bg-white/10 p-4">
              <p className="font-semibold text-white">Real-time availability</p>
              <p className="mt-2 text-sm text-blue-100">
                Instantly update instance schedules and avoid double-bookings.
              </p>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <p className="font-semibold text-white">Collaborative workflows</p>
              <p className="mt-2 text-sm text-blue-100">
                Loop in dispatch and finance with shared notes and alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-16 lg:px-12">
        <Card className="w-full max-w-md border-gray-200 shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Welcome back
            </CardTitle>
            <p className="text-sm text-gray-500">
              Sign in to manage your equipment and bookings.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleEmailLogin}>
              {error ? (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-9"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-9"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
              >
                Continue with Google
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
              <span>Need an account?</span>
              <Link
                href="/auth/register"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Create one
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <p>
                Booktractor uses signed cookies and rotating secrets to protect every owner account.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div>Loading...</div>}>
    <LoginPageInner />
  </Suspense>;
}