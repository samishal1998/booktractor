'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Search, Sparkles, ImageOff } from 'lucide-react';

export default function PublicCatalogPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  const deferredQuery = useDeferredValue(search);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const hasValidRange =
    Boolean(dateRange.start && dateRange.end) &&
    new Date(dateRange.start) < new Date(dateRange.end);

  const queryKey = trpc.client.machines.search.queryOptions({
    query: deferredQuery || undefined,
    limit: 24,
    offset: 0,
    sortBy: 'availability',
    sortOrder: 'desc',
    startTime: hasValidRange ? new Date(dateRange.start).toISOString() : undefined,
    endTime: hasValidRange ? new Date(dateRange.end).toISOString() : undefined,
  });

  const { data, isLoading } = useQuery(queryKey);

  const machines = useMemo(() => {
    return (data ?? []).map((machine) => {
      const highlights = Array.isArray(machine.specs?.highlights)
        ? (machine.specs.highlights as string[])
        : [];
      const gallery = Array.isArray(machine.specs?.images)
        ? (machine.specs.images as string[])
        : Array.isArray(machine.specs?.gallery)
          ? (machine.specs.gallery as string[])
          : [];
      const heroImage =
        typeof gallery?.[0] === 'string' && gallery[0]?.length ? (gallery[0] as string) : undefined;

      return {
        id: machine.id,
        name: machine.name,
        location:
          typeof machine.specs?.location === 'string'
            ? (machine.specs.location as string)
            : machine.ownerName,
        ownerName: machine.ownerName,
        rate: machine.pricePerHour ? `$${(machine.pricePerHour / 100).toFixed(0)}/day` : 'Custom',
        specs: highlights,
        availableForRange: machine.availableForRange ?? true,
        image: heroImage,
      };
    });
  }, [data]);

  const handleBookRequest = (machineId: string) => {
    const bookingPath = `/client/machines/${machineId}/book`;
    if (session) {
      router.push(bookingPath);
    } else {
      router.push(`/auth/login?redirect=${encodeURIComponent(bookingPath)}`);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-1 text-sm font-medium text-slate-600 shadow-sm">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Browse live inventory
          </div>
          <div>
            <p className="text-sm uppercase tracking-wide text-blue-600">Booktractor catalog</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              Search real equipment ready for hire
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Explore featured machines, review specs, and when you&apos;re ready to book we&apos;ll
              sign you in and drop you right into the checkout flow.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button asChild>
              <Link href="/client">Go to client dashboard</Link>
            </Button>
            {!session && (
              <Button variant="outline" asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <Label className="text-xs font-semibold uppercase text-slate-500">Search</Label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Skid steers, aerial lifts, telehandlers…"
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-1 flex-wrap gap-3 md:flex-none">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-semibold uppercase text-slate-500">Start date</Label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="date"
                    className="pl-9"
                    value={dateRange.start}
                    onChange={(event) =>
                      setDateRange((prev) => ({ ...prev, start: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-semibold uppercase text-slate-500">End date</Label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="date"
                    className="pl-9"
                    value={dateRange.end}
                    onChange={(event) =>
                      setDateRange((prev) => ({ ...prev, end: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {hasValidRange
              ? `Showing only machines with availability between ${dateRange.start} and ${dateRange.end}.`
              : 'Add optional dates to filter by availability.'}
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && (
            <p className="text-sm text-slate-500">Loading catalog…</p>
          )}
          {!isLoading && machines.length === 0 && (
            <p className="text-sm text-slate-500">No machines match that search yet.</p>
          )}
          {machines.map((machine) => (
            <Card key={machine.id} className="overflow-hidden">
              <div className="relative h-48 w-full bg-slate-100">
                {machine.image ? (
                  <img
                    src={machine.image}
                    alt={machine.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                    <ImageOff className="h-6 w-6" />
                    <p className="text-xs">Awaiting gallery</p>
                  </div>
                )}
              </div>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{machine.name}</CardTitle>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {machine.location}
                  </div>
                  <p className="text-xs text-slate-400">Owner · {machine.ownerName}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {machine.rate}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {machine.specs.length === 0 && (
                    <Badge variant="outline" className="text-xs text-slate-400">
                      Specs coming soon
                    </Badge>
                  )}
                  {machine.specs.map((spec) => (
                    <Badge key={spec} variant="outline" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>
                {hasValidRange && !machine.availableForRange && (
                  <Badge variant="outline" className="text-xs border-red-200 text-red-600">
                    Fully booked for selected dates
                  </Badge>
                )}
                <div className="flex gap-2">
                  <Button className="flex-1 text-sm" onClick={() => handleBookRequest(machine.id)}>
                    Request booking
                  </Button>
                  <Button asChild variant="outline" className="text-sm">
                    <Link href={`/catalog/${machine.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}


