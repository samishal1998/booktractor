'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, Lock, User, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession, signUp } from '@booktractor/app/lib/auth-client';

export function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const redirectTo = searchParams?.get('redirect') || '/owner';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && session) {
      router.replace(redirectTo);
    }
  }, [isPending, session, redirectTo, router]);

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords must match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await signUp.email(
        { name, email, password },
        {
          onSuccess: () => router.push(redirectTo),
          onError: (ctx) => setError(ctx.error.message || 'Unable to create account'),
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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-blue-50 lg:flex-row">
      <section className="order-2 flex flex-1 flex-col justify-center px-6 py-16 lg:order-1 lg:px-12">
        <Card className="mx-auto w-full max-w-md border-gray-200 shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Create owner account
            </CardTitle>
            <p className="text-sm text-gray-500">
              Start tracking your fleet and bookings in minutes.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleRegister}>
              {error ? (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="name"
                    placeholder="Jordan Rivers"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="pl-9"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="operations@booktractor.com"
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
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-9"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
              <span>Already onboard?</span>
              <Link
                href="/auth/login"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="order-1 flex flex-1 flex-col justify-center bg-blue-900/95 px-8 py-16 text-white lg:order-2 lg:px-16">
        <div className="mx-auto max-w-xl space-y-8">
          <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
            <Rocket className="mr-2 h-4 w-4" />
            Launch your owner workspace
          </div>
          <div>
            <p className="text-sm tracking-wide text-blue-200 uppercase">For equipment teams</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight">
              Own every step of the rental lifecycle
            </h1>
            <p className="mt-4 text-lg text-blue-100">
              Join fleets that use Booktractor to automate availability, stay ahead of maintenance,
              and give clients instant answers.
            </p>
          </div>
          <ul className="space-y-4 text-sm text-blue-100">
            <li>• Unlimited machines and instances per owner account</li>
            <li>• Connected bookings, payments, and messaging</li>
            <li>• Web + mobile workflows powered by a shared API</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={<div>Loading...</div>}>
    <RegisterPageInner />
  </Suspense>;
}