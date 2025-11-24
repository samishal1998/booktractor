'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  MapPin,
  Users,
  CalendarDays,
  ImageOff,
  Star,
  ShieldCheck,
} from 'lucide-react';

type MachineDetailClientProps = {
  machineId: string;
};

export default function MachineDetailClient({ machineId }: MachineDetailClientProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const { data: session } = useSession();

  const query = useQuery({
    ...trpc.client.machines.getDetails.queryOptions({
      id: machineId ?? '',
    }),
    enabled: !!machineId,
  });

  const machine = query.data;
  const gallery = Array.isArray(machine?.specs?.images)
    ? (machine?.specs?.images as string[])
    : Array.isArray(machine?.specs?.gallery)
      ? (machine?.specs?.gallery as string[])
      : [];
  const heroImage =
    typeof gallery?.[0] === 'string' && gallery[0]?.length ? (gallery[0] as string) : undefined;

  const highlights = Array.isArray(machine?.specs?.highlights)
    ? (machine?.specs?.highlights as string[])
    : [];

  const handleBook = () => {
    const bookingPath = `/client/machines/${machineId}/book`;
    if (session) {
      router.push(bookingPath);
    } else {
      router.push(`/auth/login?redirect=${encodeURIComponent(bookingPath)}`);
    }
  };

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-40 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
        <div className="grid gap-8 md:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <Skeleton className="h-[420px] w-full rounded-3xl" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-6 w-24 rounded-full" />
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-2xl" />
              ))}
            </div>
          </div>
          <aside className="space-y-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </aside>
        </div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center text-slate-600">
        <p className="text-lg font-semibold">Machine not found</p>
        <p className="mt-2 text-sm">
          It may have been removed or is no longer publicly listed.{' '}
          <Link href="/catalog" className="text-blue-600 underline">
            Return to catalog
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/catalog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to catalog
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild size="sm">
            <Link href={`/client/machines/${machineId}`}>Open client view</Link>
          </Button>
          <Button size="sm" onClick={handleBook}>
            Book this machine
          </Button>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
            {heroImage ? (
              <img src={heroImage} alt={machine.name} className="h-[420px] w-full object-cover" />
            ) : (
              <div className="flex h-[420px] flex-col items-center justify-center gap-3 text-slate-400">
                <ImageOff className="h-8 w-8" />
                <p>No gallery yet</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-slate-900">{machine.name}</h1>
            <p className="text-slate-600">{machine.description ?? 'Specs available on request.'}</p>
            <div className="flex flex-wrap gap-2">
              {highlights.length === 0 && (
                <Badge variant="outline" className="text-xs text-slate-500">
                  Specs coming soon
                </Badge>
              )}
              {highlights.map((spec) => (
                <Badge key={spec} variant="outline" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What&apos;s included</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-900">Verified owner</p>
                  <p>{machine.owner?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-900">Active instances</p>
                  <p>
                    {machine.availability.active} of {machine.availability.total} units online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="font-medium text-slate-900">Average rating</p>
                  <p className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500" />
                    {machine.averageRating} / 5
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Day rate</span>
                <span className="font-semibold text-slate-900">
                  {machine.pricePerHour ? `$${(machine.pricePerHour / 100).toFixed(0)}/day` : 'Custom'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CalendarDays className="h-4 w-4" />
                Sign in to lock in dates and checkout.
              </div>
              <Button className="w-full" onClick={handleBook}>
                Book now
              </Button>
              <p className="text-xs text-slate-500 text-center">
                We&apos;ll prompt you to sign in and bring you back to this booking.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Owner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin className="h-4 w-4" />
                {'Location shared after booking'}
              </div>
              <p>{machine.owner?.name}</p>
              <p className="text-xs text-slate-500">
                Owners review every request. Approval is usually instant during business hours.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}


