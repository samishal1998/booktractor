'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@booktractor/trpc/routers';
import {
  createFilterBuilder,
  createSorter,
  serializeFilters,
  serializeSorters,
} from '@booktractor/utils/drizzler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarRange,
  Filter,
  Loader2,
  Search,
  Wallet,
  Users,
  PackageSearch,
  X,
} from 'lucide-react';

type AppRouterOutputs = inferRouterOutputs<AppRouter>;
type BookingList = AppRouterOutputs['owner']['bookings']['listAll'];
type BookingRow = BookingList[number];

const calculateBookingValue = (booking: BookingRow) => {
  const rate = booking.pricePerHour ?? 0;
  if (!rate) return 0;
  const durationHours = Math.max(
    1,
    (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) /
      (1000 * 60 * 60)
  );
  return Math.round(durationHours * rate);
};

const formatCurrency = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value / 100);

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending_renter_approval' },
  { label: 'Approved', value: 'approved_by_renter' },
  { label: 'Needs Changes', value: 'sent_back_to_client' },
  { label: 'Rejected', value: 'rejected_by_renter' },
  { label: 'Canceled', value: 'canceled_by_client' },
] as const;

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest first' },
  { value: 'createdAt-asc', label: 'Oldest first' },
  { value: 'startTime-asc', label: 'Start date ↑' },
  { value: 'startTime-desc', label: 'Start date ↓' },
] as const;

const statusLabels: Record<string, string> = {
  pending_renter_approval: 'Pending approval',
  approved_by_renter: 'Approved',
  sent_back_to_client: 'Needs changes',
  rejected_by_renter: 'Rejected',
  canceled_by_client: 'Canceled',
};

const statusVariant: Record<string, 'warning' | 'success' | 'outline' | 'default' | 'secondary'> = {
  pending_renter_approval: 'warning',
  approved_by_renter: 'success',
  sent_back_to_client: 'secondary',
  rejected_by_renter: 'outline',
  canceled_by_client: 'outline',
};

const paymentStatusMeta = {
  pending: { label: 'Awaiting payment', className: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  refunded: { label: 'Refunded', className: 'bg-gray-100 text-gray-700' },
} as const;
type PaymentStatusKey = keyof typeof paymentStatusMeta;
const resolvePaymentStatus = (status?: string): PaymentStatusKey =>
  status && status in paymentStatusMeta ? (status as PaymentStatusKey) : 'pending';

export default function OwnerBookingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const ownerId = session?.user?.id || '';
  const machineFilter = searchParams?.get('machine') ?? '';

  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]['value']>('all');
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<(typeof SORT_OPTIONS)[number]['value']>(
    SORT_OPTIONS[0].value
  );
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);

  const deferredSearch = useDeferredValue(search);
  const trpc = useTRPC();

  const filterPayload = useMemo(() => {
    const builder = createFilterBuilder();
    if (deferredSearch.trim()) {
      builder.contains('search', deferredSearch.trim());
    }
    if (machineFilter) {
      builder.equals('machineId', machineFilter);
    }
    return serializeFilters(builder.build());
  }, [deferredSearch, machineFilter]);

  const sortPayload = useMemo(() => {
    const [field, direction] = sortOption.split('-');
    return serializeSorters([createSorter(field, direction === 'desc' ? 'desc' : 'asc')]);
  }, [sortOption]);

  const bookingsQuery = useQuery({
    ...trpc.owner.bookings.listAll.queryOptions({
      ownerId,
      status: statusFilter === 'all' ? undefined : statusFilter,
      filtersJson: filterPayload,
      sortJson: sortPayload,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
    }),
    enabled: !!ownerId,
  });

  const bookingList = useMemo(
    () => (bookingsQuery.data ?? []) as BookingRow[],
    [bookingsQuery.data]
  );

  const summary = useMemo(() => {
    const total = bookingList.length;
    const pending = bookingList.filter(
      (booking) => booking.status === 'pending_renter_approval'
    ).length;
    const needsChanges = bookingList.filter(
      (booking) => booking.status === 'sent_back_to_client'
    ).length;
    const approved = bookingList.filter(
      (booking) => booking.status === 'approved_by_renter'
    ).length;
    const totalValue = bookingList.reduce(
      (acc, booking) => acc + calculateBookingValue(booking),
      0
    );
    return { total, pending, needsChanges, approved, totalValue };
  }, [bookingList]);

  const resetFilters = () => {
    setStatusFilter('all');
    setSearch('');
    setDateRange({ start: '', end: '' });
    setSortOption(SORT_OPTIONS[0].value);
    if (machineFilter) {
      router.push('/owner/bookings');
    }
  };

  if (!ownerId) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center text-gray-600">
        <p className="text-lg font-semibold text-gray-900">Owner access required</p>
        <p className="text-sm text-gray-500">Sign in with an owner account to view bookings.</p>
        </div>
    );
  }

  if (bookingsQuery.isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
        <Loader2 className="mb-3 h-6 w-6 animate-spin" />
        Loading bookings…
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 max-w-screen-xl mx-auto">
      <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Owner Portal</p>
          <h1 className="text-3xl font-semibold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500">
            Track approvals, resolve conflicts, and follow up on conversations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={resetFilters} disabled={!search && statusFilter === 'all' && !dateRange.start && !dateRange.end && !machineFilter && sortOption === SORT_OPTIONS[0].value}>
            <Filter className="mr-2 h-4 w-4" />
            Reset filters
          </Button>
          <Button asChild>
            <Link href="/owner/calendar">
              <CalendarRange className="mr-2 h-4 w-4" />
              Calendar view
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by booking, client, or equipment"
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(event) =>
                  setDateRange((prev) => ({ ...prev, start: event.target.value }))
                }
              />
              <Input
                type="date"
                value={dateRange.end}
                onChange={(event) =>
                  setDateRange((prev) => ({ ...prev, end: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number]['value'])
              }
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(event.target.value as (typeof SORT_OPTIONS)[number]['value'])
              }
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
          </div>
        </div>
          {machineFilter && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
            Machine filter active
            <button
              type="button"
              onClick={() => router.push('/owner/bookings')}
              className="rounded-full bg-blue-100 p-1 text-blue-600 hover:bg-blue-200"
            >
              <X className="h-3 w-3" />
            </button>
            </div>
          )}
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total bookings"
          value={summary.total.toString()}
          icon={<PackageSearch className="h-5 w-5 text-blue-600" />}
        />
        <SummaryCard
          title="Pending approval"
          value={summary.pending.toString()}
          icon={<CalendarRange className="h-5 w-5 text-amber-600" />}
        />
        <SummaryCard
          title="Needs review"
          value={summary.needsChanges.toString()}
          icon={<Filter className="h-5 w-5 text-indigo-600" />}
        />
        <SummaryCard
          title="Approved value"
          value={
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(summary.totalValue / 100)
          }
          icon={<Wallet className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {bookingList.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-700">No bookings match these filters</p>
            <p className="text-sm text-gray-500">Try adjusting status or search criteria.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookingList.map((booking) => (
                <TableRow key={booking.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell>
                    <p className="font-semibold text-gray-900">#{booking.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">
                      Created{' '}
                      {(
                        booking.createdAt
                          ? new Date(booking.createdAt)
                          : new Date(booking.startTime)
                      ).toLocaleDateString()}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-gray-900">
                      {booking.clientName ?? `Client ${booking.clientAccountId.slice(0, 6)}`}
                    </p>
                    <p className="text-xs text-gray-500">Acct {booking.clientAccountId.slice(0, 8)}</p>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/owner/machines/${booking.templateId}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {booking.machineName ?? 'View machine'}
                    </Link>
                    <p className="text-xs text-gray-500">{booking.machineCode}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-900">
                      {new Date(booking.startTime).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      to {new Date(booking.endTime).toLocaleDateString()}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge className="text-nowrap" variant={statusVariant[booking.status] ?? 'secondary'}>
                      {statusLabels[booking.status] ?? booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    {(() => {
                      const total = calculateBookingValue(booking);
                      return total ? formatCurrency(total) : '—';
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const paymentStatus = resolvePaymentStatus(booking.paymentStatus);
                      const amount =
                        typeof booking.paymentAmountCents === 'number'
                          ? booking.paymentAmountCents
                          : calculateBookingValue(booking);
                      const currency = booking.paymentCurrency ?? 'USD';
                      return (
                        <div className="space-y-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              'border-transparent font-medium text-nowrap',
                              paymentStatusMeta[paymentStatus].className
                            )}
                          >
                            {paymentStatusMeta[paymentStatus].label}
                          </Badge>
                          <p className="text-xs text-gray-500">
                            {amount ? formatCurrency(amount, currency) : '—'}
                          </p>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedBooking(booking);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {bookingsQuery.isFetching && (
          <div className="border-t border-gray-100 px-6 py-2 text-xs text-gray-500">
            Refreshing…
        </div>
        )}
      </div>

      <BookingDrawer booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
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

function BookingDrawer({
  booking,
  onClose,
}: {
  booking: BookingRow | null;
  onClose: () => void;
}) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-xl border-l border-gray-200 bg-white shadow-2xl transition-transform">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-sm text-gray-500">Booking #{booking.id.slice(0, 8)}</p>
            <h3 className="text-xl font-semibold text-gray-900">
              {booking.machineName ?? 'Equipment'} ·{' '}
              {new Date(booking.startTime).toLocaleDateString()}
          </h3>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="flex items-center justify-between">
            <Badge variant={statusVariant[booking.status] ?? 'secondary'}>
              {statusLabels[booking.status] ?? booking.status}
            </Badge>
                      <Link
                        href={`/owner/bookings/${booking.id}`}
              className="text-sm font-medium text-blue-600 hover:underline"
                      >
              Open full view
                      </Link>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Client</p>
            <p className="text-sm font-semibold text-gray-900">
              {booking.clientName ?? `Client ${booking.clientAccountId.slice(0, 8)}`}
            </p>
            <p className="text-xs text-gray-500">Acct {booking.clientAccountId}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <InfoBlock label="Start" value={new Date(booking.startTime).toLocaleString()} />
            <InfoBlock label="End" value={new Date(booking.endTime).toLocaleString()} />
            <InfoBlock label="Instance" value={booking.instanceCode ?? 'Auto assign'} />
            <InfoBlock
              label="Estimated total"
              value={
                calculateBookingValue(booking)
                  ? formatCurrency(calculateBookingValue(booking))
                  : 'Pending'
              }
            />
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Notes</p>
            <p className="text-sm text-gray-700">
              Review and respond in the detailed view to keep the client updated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
