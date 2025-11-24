'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';
import {
  Tractor,
  CalendarRange,
  Hourglass,
  DollarSign,
  Factory,
  ClipboardList,
  CalendarDays,
  TrendingUp,
  PieChart,
  Gauge,
} from 'lucide-react';

export default function OwnerDashboardPage() {
  const { data: session } = useSession();
  const trpc = useTRPC();

  const { data: stats, isLoading } = useQuery({
    ...trpc.owner.analytics.dashboardStats.queryOptions({
      ownerId: session?.user?.id || '',
    }),
    enabled: !!session?.user?.id,
  });

  const { data: machines } = useQuery({
    ...trpc.owner.machines.list.queryOptions({
      ownerId: session?.user?.id || '',
    }),
    enabled: !!session?.user?.id,
  });

  const { data: pendingBookings } = useQuery({
    ...trpc.owner.bookings.listAll.queryOptions({
      ownerId: session?.user?.id || '',
      status: 'pending_renter_approval',
      limit: 5,
    }),
    enabled: !!session?.user?.id,
  });

  const { data: recentBookings } = useQuery({
    ...trpc.owner.bookings.listAll.queryOptions({
      ownerId: session?.user?.id || '',
      limit: 50,
    }),
    enabled: !!session?.user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 min-w-[100vw]">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Owner Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your equipment and bookings
              </p>
            </div>
            <Link
              href="/owner/machines/create"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + Add Equipment
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Equipment"
            value={stats?.totalMachines || 0}
            icon={<Tractor className="h-6 w-6 text-blue-600" />}
          />
          <StatCard
            title="Active Bookings"
            value={stats?.activeBookings || 0}
            icon={<CalendarRange className="h-6 w-6 text-green-600" />}
          />
          <StatCard
            title="Pending Approval"
            value={stats?.pendingBookings || 0}
            icon={<Hourglass className="h-6 w-6 text-amber-600" />}
          />
          <StatCard
            title="Total Revenue"
            value={`$${((stats?.totalRevenue || 0) / 100).toFixed(2)}`}
            icon={<DollarSign className="h-6 w-6 text-purple-600" />}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <QuickAction
            title="Manage Equipment"
            description="View and update your equipment"
            href="/owner/machines"
            icon={<Factory className="h-6 w-6 text-blue-600" />}
          />
          <QuickAction
            title="View Bookings"
            description="See all your bookings"
            href="/owner/bookings"
            icon={<ClipboardList className="h-6 w-6 text-indigo-600" />}
          />
          <QuickAction
            title="Calendar View"
            description="Visual booking timeline"
            href="/owner/calendar"
            icon={<CalendarDays className="h-6 w-6 text-emerald-600" />}
          />
        </div>

        <AnalyticsSection
          stats={stats}
          machines={machines ?? []}
          bookings={recentBookings ?? []}
        />

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Machines */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Your Equipment
              </h2>
              <Link
                href="/owner/machines"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
            {!machines || machines.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No equipment added yet</p>
                <Link
                  href="/owner/machines/create"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add your first equipment
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {machines.slice(0, 5).map((machine) => (
                  <Link
                    key={machine.id}
                    href={`/owner/machines/${machine.id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 transition border border-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {machine.name}
                        </h3>
                        <p className="text-sm text-gray-600">{machine.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {machine.stats?.activeInstanceCount || 0}/{machine.stats?.instanceCount || 0}
                        </p>
                        <p className="text-xs text-gray-500">available</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pending Bookings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Pending Approval
              </h2>
              <Link
                href="/owner/bookings?status=pending"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All →
              </Link>
            </div>
            {!pendingBookings || pendingBookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No pending bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/owner/bookings/${booking.id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 transition border border-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {booking.machineName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(booking.startTime).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                        Pending
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-3">
      <div className="inline-flex items-center justify-center rounded-lg bg-gray-100 p-3">
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
    </div>
  );
}

function QuickAction({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition"
    >
      <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-blue-50 p-3 text-blue-600">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}

function AnalyticsSection({
  stats,
  machines,
  bookings,
}: {
  stats?: {
    totalMachines: number;
    totalBookings: number;
    pendingBookings: number;
    activeBookings: number;
    totalRevenue: number;
  } | null;
  machines: Array<any>;
  bookings: Array<any>;
}) {
  const revenueSeries = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const label = date.toLocaleDateString('en-US', { month: 'short' });
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      return { label, start, end };
    });

    return months.map(({ label, start, end }) => {
      const total = bookings
        .filter((booking) => {
          const startTime = new Date(booking.startTime);
          return startTime >= start && startTime < end;
        })
        .reduce((sum, booking) => sum + calculateBookingValue(booking), 0);
      return { label, total };
    });
  }, [bookings]);

  const statusBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    bookings.forEach((booking) => {
      totals[booking.status] = (totals[booking.status] || 0) + 1;
    });
    const entries = Object.entries(totals);
    if (entries.length === 0) {
      return [];
    }
    const max = Math.max(...entries.map(([, count]) => count));
    return entries.map(([status, count]) => ({
      status,
      count,
      ratio: max === 0 ? 0 : (count / max) * 100,
    }));
  }, [bookings]);

  const topMachines = useMemo(() => {
    return (machines ?? [])
      .map((machine) => {
        const active = machine.stats?.activeInstanceCount ?? 0;
        const total = machine.stats?.instanceCount ?? 0;
        const utilization = total > 0 ? Math.round((active / total) * 100) : 0;
        return {
          id: machine.id,
          name: machine.name,
          utilization,
        };
      })
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 5);
  }, [machines]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Revenue trend (last 6 months)</h3>
        </div>
        <div className="space-y-3">
          {revenueSeries.map(({ label, total }) => {
            const display = total / 100;
            return (
              <div key={label}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{label}</span>
                  <span>${display.toFixed(0)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${Math.min((display / 1000) * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-900">Booking mix</h3>
        </div>
        <div className="space-y-3">
          {statusBreakdown.map(({ status, count, ratio }) => (
            <div key={status}>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                <span>{count}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-indigo-500"
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          ))}
          {statusBreakdown.length === 0 && (
            <p className="text-sm text-gray-500">Not enough booking data yet.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-900">Top machine utilization</h3>
        </div>
        <div className="space-y-3">
          {topMachines.map((machine) => (
            <div key={machine.id}>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{machine.name}</span>
                <span>{machine.utilization}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${machine.utilization}%` }}
                />
              </div>
            </div>
          ))}
          {topMachines.length === 0 && (
            <p className="text-sm text-gray-500">Add machines to see utilization insights.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function calculateBookingValue(booking: any) {
  const rate = booking.pricePerHour ?? 0;
  if (!rate) return 0;
  const durationHours = Math.max(
    1,
    (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) /
      (1000 * 60 * 60)
  );
  return Math.round(durationHours * rate);
}
