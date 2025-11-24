'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';

export default function MachineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const machineId = params?.id as string;
  const trpc = useTRPC();
  const [isEditing, setIsEditing] = useState(false);
  const { data: session, isLoading: isSessionLoading } = useSession();
  const ownerId = session?.user?.id || '';

  const {
    data: machines,
    isLoading,
  } = useQuery({
    ...trpc.owner.machines.list.queryOptions({
      ownerId,
    }),
    enabled: !!ownerId,
  });

  const updateMutation = useMutation({
    ...trpc.owner.machines.update.mutationOptions(),
    onSuccess: () => {
      setIsEditing(false);
    },
  });

  const archiveMutation = useMutation({
    ...trpc.owner.machines.archive.mutationOptions(),
    onSuccess: () => {
      router.push('/owner/machines');
    },
  });

  const { data: bookings } = useQuery({
    ...trpc.owner.bookings.listByMachine.queryOptions({
      ownerId,
      machineId,
    }),
    enabled: !!ownerId && !!machineId,
  });

  const machineList = (machines ?? []) as Array<any>;
  const bookingList = (bookings ?? []) as Array<any>;

  if (isSessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your owner session...</p>
        </div>
      </div>
    );
  }

  if (!ownerId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-gray-900">
            Owner access required
          </p>
          <p className="text-gray-600">
            Sign in with an owner account to view machine details.
          </p>
        </div>
      </div>
    );
  }

  const currentMachine = machineList.find((m: any) => m.id === machineId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading equipment...</p>
        </div>
      </div>
    );
  }

  if (!currentMachine) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">Equipment not found</p>
          <Link
            href="/owner/machines"
            className="text-blue-600 hover:underline mt-2 inline-block"
          >
            Back to Equipment List
          </Link>
        </div>
      </div>
    );
  }

  const handleArchive = async () => {
    if (
      confirm(
        'Are you sure you want to archive this equipment? It will no longer be visible to clients.'
      )
    ) {
      await archiveMutation.mutateAsync({
        ownerId,
        id: machineId,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Link href="/owner/machines" className="hover:text-blue-600">
            Equipment
          </Link>
          <span>/</span>
          <span className="text-gray-900">{currentMachine.name}</span>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {currentMachine.name}
            </h1>
            <p className="text-gray-600 mt-1">{currentMachine.code}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              {isEditing ? 'Cancel Edit' : 'Edit'}
            </button>
            <button
              onClick={handleArchive}
              disabled={archiveMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Equipment Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Details</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Category
                </label>
                <p className="text-gray-900 mt-1">
                  {currentMachine.category || 'Uncategorized'}
                </p>
              </div>

              {currentMachine.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Description
                  </label>
                  <p className="text-gray-900 mt-1">
                    {currentMachine.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Price per Hour
                  </label>
                  <p className="text-gray-900 mt-1 text-lg font-semibold">
                    {currentMachine.pricePerHour
                      ? `$${(currentMachine.pricePerHour / 100).toFixed(2)}`
                      : 'Not set'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Total Units
                  </label>
                  <p className="text-gray-900 mt-1 text-lg font-semibold">
                    {currentMachine.stats?.instanceCount || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Statistics</h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {currentMachine.stats?.activeInstanceCount || 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">Available Units</p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {currentMachine.stats?.activeBookingCount || 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">Active Bookings</p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {currentMachine.stats?.bookingCount || 0}
                </p>
                <p className="text-sm text-gray-600 mt-1">Total Bookings</p>
              </div>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Recent Bookings</h2>
              <Link
                href={`/owner/bookings?machine=${machineId}`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View All
              </Link>
            </div>

            {bookingList.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No bookings yet for this equipment
              </p>
            ) : (
              <div className="space-y-3">
                {bookingList.slice(0, 5).map((booking: any) => (
                  <Link
                    key={booking.id}
                    href={`/owner/bookings/${booking.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          Booking #{booking.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(booking.startTime).toLocaleDateString()} -{' '}
                          {new Date(booking.endTime).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : booking.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : booking.status === 'active'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>

            <div className="space-y-2">
              <Link
                href={`/owner/calendar?machine=${machineId}`}
                className="block w-full px-4 py-2 text-center border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                View Calendar
              </Link>

              <Link
                href={`/owner/bookings?machine=${machineId}`}
                className="block w-full px-4 py-2 text-center border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                View Bookings
              </Link>

              <Link
                href={`/owner/machines/${machineId}/instances`}
                className="block w-full px-4 py-2 text-center border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Manage Units
              </Link>
            </div>
          </div>

          {/* Availability Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Availability</h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Units</span>
                <span className="font-medium text-gray-900">
                  {currentMachine.stats?.instanceCount || 0}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Available Now</span>
                <span className="font-medium text-green-600">
                  {currentMachine.stats?.activeInstanceCount || 0}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">In Use</span>
                <span className="font-medium text-blue-600">
                  {(currentMachine.stats?.instanceCount || 0) -
                    (currentMachine.stats?.activeInstanceCount || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
