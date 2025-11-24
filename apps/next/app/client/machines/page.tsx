'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@booktractor/app/lib/trpc';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Package, MapPin, Filter, Search, Calendar, ImageOff } from 'lucide-react';

export default function ClientCatalogPage() {
  const trpc = useTRPC();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const deferredSearch = useDeferredValue(search);

  const toISODate = (value: string, endOfDay = false) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    }
    return date.toISOString();
  };

  const startISO = toISODate(dateRange.start);
  const endISO = toISODate(dateRange.end, true);
  const hasValidRange =
    Boolean(startISO && endISO) &&
    new Date(dateRange.start).getTime() <= new Date(dateRange.end).getTime();

  const searchQuery = useQuery({
    ...trpc.client.machines.search.queryOptions({
      query: deferredSearch || undefined,
      limit: 20,
      offset: 0,
      startTime: hasValidRange ? startISO : undefined,
      endTime: hasValidRange ? endISO : undefined,
    }),
  });

  const machines = useMemo(() => {
    return (searchQuery.data ?? []).map((row) => {
      const highlights = Array.isArray(row.specs?.highlights)
        ? (row.specs.highlights as string[])
        : [];
      const gallery = Array.isArray(row.specs?.images)
        ? (row.specs.images as string[])
        : Array.isArray(row.specs?.gallery)
          ? (row.specs.gallery as string[])
          : [];
      const heroImage =
        typeof gallery?.[0] === 'string' && gallery[0]?.length ? (gallery[0] as string) : undefined;

      return {
        id: row.id,
        name: row.name,
        location:
          typeof row.specs?.location === 'string' ? (row.specs.location as string) : row.ownerName,
        rate: row.pricePerHour ? `$${(row.pricePerHour / 100).toFixed(0)}/day` : 'Contact for rate',
        availability: row.availabilityJson ? 'Availability published' : 'Check availability',
        specs: highlights,
        ownerName: row.ownerName,
        availableForRange: row.availableForRange ?? true,
        image: heroImage,
      };
    });
  }, [searchQuery.data]);

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600">Catalog</p>
          <h1 className="text-3xl font-semibold text-slate-900">Find equipment</h1>
          <p className="text-sm text-slate-500">
            Filter by category, availability window, and location to request equipment.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button>
            <Package className="mr-2 h-4 w-4" />
            New request
          </Button>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search machines, categories, tags…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Start date</Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(event) =>
                    setDateRange((prev) => ({ ...prev, start: event.target.value }))
                  }
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">End date</Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(event) =>
                    setDateRange((prev) => ({ ...prev, end: event.target.value }))
                  }
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {hasValidRange
              ? `Showing machines with at least one unit free between ${dateRange.start} and ${dateRange.end}.`
              : 'Select a date range to filter by availability.'}
          </div>
          {!hasValidRange && dateRange.start && dateRange.end && (
            <span className="text-red-500">End date must be after start date.</span>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {machines.length === 0 && (
          <p className="text-sm text-slate-500">
            {searchQuery.isLoading ? 'Loading machines…' : 'No machines found.'}
          </p>
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
                  <p className="text-xs">Image coming soon</p>
                </div>
              )}
            </div>

            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">{machine.name}</CardTitle>
                <div className="text-xs text-slate-500 flex items-center gap-1">
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
              <p className="text-sm text-slate-600">{machine.availability}</p>
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
                <Link
                  href={`/client/machines/${machine.id}/book`}
                  className={buttonVariants({
                    size: 'sm',
                    className: 'flex-1 text-center',
                  })}
                >
                  Request booking
                </Link>
                <Link
                  href={`/client/machines/${machine.id}`}
                  className={buttonVariants({
                    size: 'sm',
                    variant: 'outline',
                  })}
                >
                  Details
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

