'use client';

import { useTRPC } from '@booktractor/app/lib/trpc';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@booktractor/app/lib/auth-client';
import Link from 'next/link';

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
    <div className="min-h-screen bg-gray-50">
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
            icon="🚜"
            color="blue"
          />
          <StatCard
            title="Active Bookings"
            value={stats?.activeBookings || 0}
            icon="📅"
            color="green"
          />
          <StatCard
            title="Pending Approval"
            value={stats?.pendingBookings || 0}
            icon="⏳"
            color="yellow"
          />
          <StatCard
            title="Total Revenue"
            value={`$${((stats?.totalRevenue || 0) / 100).toFixed(2)}`}
            icon="💰"
            color="purple"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <QuickAction
            title="Manage Equipment"
            description="View and update your equipment"
            href="/owner/machines"
            icon="🏗️"
          />
          <QuickAction
            title="View Bookings"
            description="See all your bookings"
            href="/owner/bookings"
            icon="📋"
          />
          <QuickAction
            title="Calendar View"
            description="Visual booking timeline"
            href="/owner/calendar"
            icon="📊"
          />
        </div>

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
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <div className={`text-3xl ${colorClasses[color]} rounded-lg p-2`}>
          {icon}
        </div>
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
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}
