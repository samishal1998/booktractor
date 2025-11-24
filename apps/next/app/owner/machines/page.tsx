'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createFilterBuilder,
  createSorter,
  serializeFilters,
  serializeSorters,
} from '@booktractor/utils/drizzler';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';
import {
  Badge,
} from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Filter,
  SortDesc,
  Package,
  Boxes,
  ClipboardCheck,
  Tractor,
  PackageX,
} from 'lucide-react';

const sortOptions = [
  { value: 'createdAt-desc', label: 'Newest' },
  { value: 'createdAt-asc', label: 'Oldest' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'pricePerHour-desc', label: 'Rate high → low' },
  { value: 'pricePerHour-asc', label: 'Rate low → high' },
];

export default function OwnerMachinesPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState(sortOptions[0].value);
  const deferredSearch = useDeferredValue(search);

  const { data: session } = useSession();
  const ownerId = session?.user?.id || '';
  const trpc = useTRPC();

  const filterPayload = useMemo(() => {
    const builder = createFilterBuilder();
    if (deferredSearch.trim()) {
      builder.contains('search', deferredSearch.trim());
    }
    return serializeFilters(builder.build());
  }, [deferredSearch]);

  const sortPayload = useMemo(() => {
    const [field, direction] = sortOption.split('-');
    const sorters = [createSorter(field, direction === 'desc' ? 'desc' : 'asc')];
    return serializeSorters(sorters);
  }, [sortOption]);

  const {
    data: machines,
    isLoading,
    isFetching,
  } = useQuery({
    ...trpc.owner.machines.list.queryOptions({
      ownerId,
      includeArchived: showArchived,
      filtersJson: filterPayload,
      sortJson: sortPayload,
    }),
    enabled: !!ownerId,
  });

  const machineList = useMemo(
    () => (machines ?? []) as Array<any>,
    [machines]
  );

  const summary = useMemo(() => {
    const templates = machineList.length;
    const totalUnits = machineList.reduce(
      (acc, machine) => acc + (machine.stats?.instanceCount ?? 0),
      0
    );
    const activeUnits = machineList.reduce(
      (acc, machine) => acc + (machine.stats?.activeInstanceCount ?? 0),
      0
    );
    const activeBookings = machineList.reduce(
      (acc, machine) => acc + (machine.stats?.activeBookingCount ?? 0),
      0
    );
    return { templates, totalUnits, activeUnits, activeBookings };
  }, [machineList]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }),
    []
  );

  const formatCurrency = (value?: number | null) => {
    if (!value) return '—';
    return currencyFormatter.format(value / 100);
  };

  const formatDateLabel = (value?: string | Date | null) => {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Owner Portal</p>
          <h1 className="text-3xl font-semibold text-gray-900">Equipment</h1>
          <p className="text-gray-600 mt-1">
            Track utilization, active bookings, and availability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setSearch('');
              setShowArchived(false);
              setSortOption(sortOptions[0].value);
            }}
            disabled={!search && !showArchived && sortOption === sortOptions[0].value}
          >
            <Filter className="mr-2 h-4 w-4" />
            Reset filters
          </Button>
          <Button asChild>
            <Link href="/owner/machines/create">
              Add machine
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total templates"
          value={summary.templates.toString()}
          icon={<Package className="h-5 w-5 text-blue-600" />}
        />
        <SummaryCard
          title="Active units"
          value={`${summary.activeUnits}/${summary.totalUnits}`}
          icon={<Boxes className="h-5 w-5 text-emerald-600" />}
        />
        <SummaryCard
          title="Active bookings"
          value={summary.activeBookings.toString()}
          icon={<ClipboardCheck className="h-5 w-5 text-indigo-600" />}
        />
        <SummaryCard
          title="Average rate"
          value={
            summary.templates
              ? currencyFormatter.format(
                  machineList.reduce(
                    (acc, machine) => acc + (machine.pricePerHour ?? 0),
                    0
                  ) /
                    summary.templates /
                    100
                )
              : '—'
          }
          icon={<Tractor className="h-5 w-5 text-amber-600" />}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or code"
                className="pl-9"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show archived
            </label>
          </div>

          <div className="flex items-center gap-2">
            <SortDesc className="h-4 w-4 text-gray-400" />
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {machineList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-gray-500">
            <PackageX className="h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-700">No machines match your filters</p>
            <p className="text-sm text-gray-500">
              Adjust the search or add a new machine to get started.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Active bookings</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Last updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machineList.map((machine: any) => {
                const updatedAt = machine.updatedAt ?? machine.createdAt;
                const isRecentlyAdded =
                  updatedAt &&
                  Date.now() - new Date(updatedAt).getTime() <
                    7 * 24 * 60 * 60 * 1000;
                const category =
                  typeof machine.specs?.category === 'string'
                    ? machine.specs.category
                    : 'General';
                return (
                  <TableRow
                    key={machine.id}
                    className="cursor-pointer"
                  >
                    <TableCell className="space-y-1">
                      <Link
                        href={`/owner/machines/${machine.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <Tractor className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 hover:underline">
                              {machine.name}
                            </p>
                            {isRecentlyAdded && (
                              <Badge variant="success">New</Badge>
                            )}
                          </div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            {machine.code} • {category}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-semibold text-gray-900">
                        {machine.stats?.activeInstanceCount ?? 0}
                        <span className="text-gray-400">
                          /{machine.stats?.instanceCount ?? 0}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Available / Total</p>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-semibold text-gray-900">
                        {machine.stats?.activeBookingCount ?? 0}
                      </div>
                      <p className="text-xs text-gray-500">
                        {machine.stats?.bookingCount ?? 0} lifetime
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(machine.pricePerHour)}
                      </div>
                      <p className="text-xs text-gray-500">per hour</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-700">
                        {formatDateLabel(updatedAt)}
                      </p>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {isFetching && (
          <div className="border-t border-gray-100 px-6 py-2 text-xs text-gray-500">
            Refreshing…
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b-0 px-6 py-4">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}
