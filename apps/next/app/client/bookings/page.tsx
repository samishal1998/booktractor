'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';
import { useQuery } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@booktractor/trpc/routers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Search } from 'lucide-react';

type AppRouterOutputs = inferRouterOutputs<AppRouter>;
type BookingList = AppRouterOutputs['client']['bookings']['myBookings'];
type BookingRow = BookingList[number];

const statusMap: Record<
  string,
  { label: string; variant: 'secondary' | 'default' | 'outline' | 'warning' | 'success' }
> = {
  pending_renter_approval: { label: 'Pending Approval', variant: 'warning' },
  approved_by_renter: { label: 'Approved', variant: 'success' },
  sent_back_to_client: { label: 'Needs updates', variant: 'secondary' },
  rejected_by_renter: { label: 'Rejected', variant: 'outline' },
  canceled_by_client: { label: 'Canceled', variant: 'outline' },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value / 100);

export default function ClientBookingsPage() {
  const { data: session } = useSession();
  const clientId = session?.user?.id || '';
  const trpc = useTRPC();
  const [search, setSearch] = useState('');

  const bookingsQuery = useQuery({
    ...trpc.client.bookings.myBookings.queryOptions({
      clientId,
      includeHistory: true,
    }),
    enabled: !!clientId,
  });

  const bookingList = useMemo(
    () => (bookingsQuery.data ?? []) as BookingRow[],
    [bookingsQuery.data]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return bookingList;
    return bookingList.filter(
      (booking) =>
        booking.id.toLowerCase().includes(search.toLowerCase()) ||
        (booking.machineName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (booking.instanceCode ?? '').toLowerCase().includes(search.toLowerCase())
    );
  }, [search, bookingList]);

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600">Bookings</p>
          <h1 className="text-3xl font-semibold text-slate-900">Manage rentals</h1>
          <p className="text-sm text-slate-500">
            Track approvals, share delivery details, and keep balances current.
          </p>
        </div>
        <Button asChild>
          <Link href="/client/machines">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule new booking
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>Active & recent bookings</CardTitle>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search booking ID or machine…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Upcoming</Badge>
              <Badge variant="outline">Needs action</Badge>
              <Badge variant="outline">Completed</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
            {filtered.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-semibold text-slate-900">
                    {booking.id}
                  </TableCell>
                  <TableCell>{booking.machineName ?? booking.machineCode}</TableCell>
                  <TableCell>
                    {new Date(booking.startTime).toLocaleDateString()} –{' '}
                    {new Date(booking.endTime).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusMap[booking.status]?.variant ?? 'secondary'} className="text-nowrap">
                      {statusMap[booking.status]?.label ?? booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    {formatCurrency(booking.totalPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/client/bookings/${booking.id}`}>Manage</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

