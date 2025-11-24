'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';
import { useQuery } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@booktractor/trpc/routers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  CreditCard,
  FileText,
  MapPin,
  MessageSquare,
  PackageSearch,
  Plus,
  ShieldCheck,
  Truck,
} from 'lucide-react';

type AppRouterOutputs = inferRouterOutputs<AppRouter>;
type FeaturedList = AppRouterOutputs['client']['machines']['featured'];
type BookingList = AppRouterOutputs['client']['bookings']['myBookings'];
type BookingRow = BookingList[number];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value / 100);

export default function ClientDashboard() {
  const { data: session } = useSession();
  const clientId = session?.user?.id || '';
  const trpc = useTRPC();

  const featuredQuery = useQuery({
    ...trpc.client.machines.featured.queryOptions(),
  });

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

  const displayFeatured = useMemo(() => {
    return ((featuredQuery.data ?? []) as FeaturedList).map((machine) => ({
      id: machine.id,
      name: machine.name,
      location:
        typeof machine.specs?.location === 'string'
          ? (machine.specs.location as string)
          : 'Contact owner',
      rate:
        typeof machine.pricePerHour === 'number'
          ? `$${(machine.pricePerHour / 100).toFixed(0)}/day`
          : 'Contact for rate',
      availability: machine.availabilityJson ? 'Availability published' : 'Check availability',
      tags: Array.isArray(machine.specs?.highlights)
        ? (machine.specs?.highlights as string[])
        : [],
    }));
  }, [featuredQuery.data]);

  const outstandingBookings = useMemo(
    () =>
      bookingList.filter(
        (booking) =>
          booking.paymentStatus !== 'completed' &&
          booking.status === 'approved_by_renter'
      ),
    [bookingList]
  );

  const outstandingBalance = useMemo(
    () => outstandingBookings.reduce((sum, booking) => sum + booking.totalPrice, 0),
    [outstandingBookings]
  );

  const nextOutstandingBooking = useMemo(() => {
    if (outstandingBookings.length === 0) return null;
    return [...outstandingBookings].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )[0];
  }, [outstandingBookings]);

  const summaryMetrics = useMemo(() => {
    const active = bookingList.filter(
      (booking) =>
        booking.status === 'approved_by_renter' &&
        new Date(booking.endTime) >= new Date()
    );
    const pending = bookingList.filter(
      (booking) => booking.status === 'pending_renter_approval'
    );
    const upcoming = bookingList.filter(
      (booking) =>
        new Date(booking.startTime) > new Date() &&
        new Date(booking.startTime).getTime() - Date.now() <
          1000 * 60 * 60 * 24 * 7
    );

    return [
      {
        label: 'Active bookings',
        value: active.length,
        trend: `${active.length} in progress`,
      },
      {
        label: 'Pending approvals',
        value: pending.length,
        trend: pending.length ? 'Owner review required' : 'All clear',
      },
      {
        label: 'Outstanding balance',
        value: formatCurrency(outstandingBalance),
        trend: `${outstandingBookings.length} booking(s) due`,
      },
      {
        label: 'Upcoming handoffs',
        value: upcoming.length,
        trend: 'Next 7 days',
      },
    ];
  }, [bookingList, outstandingBalance, outstandingBookings]);

  const actionItems = useMemo(() => {
    const actions: Array<{ title: string; description: string; href: string }> =
      [];

    bookingList.forEach((booking) => {
      if (
        booking.paymentStatus !== 'succeeded' &&
        booking.status === 'approved_by_renter'
      ) {
        actions.push({
          title: `Pay balance for ${booking.machineName ?? booking.id}`,
          description: `${formatCurrency(
            booking.totalPrice
          )} outstanding before ${new Date(
            booking.startTime
          ).toLocaleDateString()}`,
          href: `/client/bookings/${booking.id}`,
        });
      }

      if (
        booking.status === 'pending_renter_approval' &&
        new Date(booking.startTime) < new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
      ) {
        actions.push({
          title: `Provide details for ${booking.machineName ?? booking.id}`,
          description: 'Owner awaiting confirmation before next week',
          href: `/client/bookings/${booking.id}`,
        });
      }
    });

    return actions.slice(0, 3);
  }, [bookingList]);

  const conversations = useMemo(() => {
    const threads = bookingList
      .flatMap((booking) =>
        (booking.messages ?? []).map((msg) => ({
          bookingId: booking.id,
          bookingLabel: booking.machineName ?? booking.id,
          message: msg.content,
          timestamp: msg.ts,
          isClient: msg.sender_id === clientId,
        }))
      )
      .sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 3);
    return threads;
  }, [bookingList, clientId]);

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600">Client workspace</p>
          <h1 className="text-3xl font-semibold text-slate-900">Good afternoon.</h1>
          <p className="text-sm text-slate-500">
            Track active rentals, keep documents up to date, and request the equipment you need.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/client/machines">
              <PackageSearch className="mr-2 h-4 w-4" />
              Browse catalog
            </Link>
          </Button>
          <Button asChild>
            <Link href="/client/bookings">
              <Plus className="mr-2 h-4 w-4" />
              Start booking
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <p className="text-sm text-slate-500">{metric.label}</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{metric.value}</p>
              <p className="text-xs text-emerald-600 mt-1">{metric.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active bookings</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/client/bookings">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {bookingList.length === 0 && (
              <p className="text-sm text-slate-500">No bookings yet.</p>
            )}
            {bookingList.slice(0, 3).map((booking) => (
              <div
                key={booking.id}
                className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {booking.machineName ?? booking.id}
                  </p>
                  <p className="text-xs text-slate-500">
                    Instance: {booking.instanceCode}
                  </p>
                </div>
                <div className="flex flex-col gap-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {new Date(booking.startTime).toLocaleDateString()} –{' '}
                    {new Date(booking.endTime).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-slate-400" />
                    {booking.status.replace(/_/g, ' ')}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/client/bookings/${booking.id}`}>Manage</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionItems.length === 0 && (
              <p className="text-sm text-slate-500">
                You're all caught up. We'll surface tasks here when something needs attention.
              </p>
            )}
            {actionItems.map((task) => (
              <div key={task.title} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                <p className="text-xs text-slate-500">{task.description}</p>
                <Button variant="ghost" className="px-0 text-emerald-600" asChild>
                  <Link href={task.href}>Open booking</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Featured machines</CardTitle>
            <Badge variant="outline" className="text-xs">
              Curated for you
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayFeatured.length === 0 && (
              <p className="text-sm text-slate-500">
                {featuredQuery.isLoading ? 'Loading featured machines…' : 'No featured machines available.'}
              </p>
            )}
            {displayFeatured.map((machine) => (
              <div
                key={machine.id}
                className="rounded-xl border border-slate-200 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{machine.name}</p>
                  <p className="text-sm font-medium text-emerald-600">{machine.rate}</p>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {machine.location}
                </div>
                <p className="text-xs text-slate-600">{machine.availability}</p>
                <div className="flex flex-wrap gap-2">
                  {machine.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button asChild className="flex-1" size="sm">
                    <Link href="/client/machines">Book now</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/client/machines">View details</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Billing & paperwork</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/client/documents">
                Manage
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  {nextOutstandingBooking ? 'Balance due' : 'All paid up'}
                </p>
                <p className="text-xs text-amber-800">
                  {nextOutstandingBooking
                    ? `${formatCurrency(
                        nextOutstandingBooking.totalPrice
                      )} for ${nextOutstandingBooking.machineName ?? nextOutstandingBooking.id.slice(0, 8)} due ${new Date(
                        nextOutstandingBooking.startTime
                      ).toLocaleDateString()}`
                    : 'No unpaid bookings at the moment.'}
                </p>
              </div>
              {nextOutstandingBooking ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/client/bookings/${nextOutstandingBooking.id}`}>Pay</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Pay
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-3 flex items-center gap-3">
              <FileText className="h-5 w-5 text-slate-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Permits & POs</p>
                <p className="text-xs text-slate-500">Upload revised PO for Project Falcon</p>
              </div>
                      <Button variant="outline" size="sm" disabled>
                        Upload
                      </Button>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Compliance</p>
                <p className="text-xs text-slate-500">Insurance valid through Mar 15</p>
              </div>
              <Button variant="ghost" size="sm" className="text-emerald-600">
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Latest conversations</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/client/bookings">
              Inbox
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {conversations.length === 0 && (
            <p className="text-sm text-slate-500">No recent conversations.</p>
          )}
          {conversations.map((thread) => (
            <div
              key={`${thread.bookingId}-${thread.timestamp}`}
              className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
            >
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold text-slate-900">
                    {thread.bookingLabel}
                  </p>
                  <span className="text-xs text-slate-500">
                    {new Date(thread.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{thread.message}</p>
                <Button variant="ghost" size="sm" className="px-0 text-emerald-600" asChild>
                  <Link href={`/client/bookings/${thread.bookingId}`}>Reply</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

