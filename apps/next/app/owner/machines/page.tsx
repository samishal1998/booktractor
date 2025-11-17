'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC } from '@booktractor/app/lib/trpc';

export default function OwnerMachinesPage() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: session, isLoading: isSessionLoading } = useSession();
  const ownerId = session?.user?.id || '';
  const trpc = useTRPC();

  const {
    data: machines,
    isLoading,
  } = useQuery({
    ...trpc.owner.machines.list.queryOptions({
      ownerId: ownerId,
      includeArchived: showArchived,
    }),
    enabled: !!ownerId,
  });

  const machineList = (machines ?? []) as Array<any>;

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
            Sign in with an owner account to view and manage equipment.
          </p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Equipment</h1>
          <p className="text-gray-600 mt-1">
            Manage your equipment inventory
          </p>
        </div>
        <Link
          href="/owner/machines/create"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + Add Equipment
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Show archived</span>
          </label>
        </div>
      </div>

      {/* Equipment Grid */}
      {machineList.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">🏗️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No Equipment Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Start by adding your first piece of equipment
          </p>
          <Link
            href="/owner/machines/create"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Add Equipment
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machineList.map((machine: any) => (
            <MachineCard key={machine.id} machine={machine} />
          ))}
        </div>
      )}
    </div>
  );
}

function MachineCard({ machine }: { machine: any }) {
  return (
    <Link
      href={`/owner/machines/${machine.id}`}
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition overflow-hidden"
    >
      {/* Image placeholder */}
      <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
        <span className="text-6xl">🚜</span>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{machine.name}</h3>
            <p className="text-sm text-gray-600">{machine.code}</p>
          </div>
          {machine.pricePerHour && (
            <div className="bg-blue-50 px-3 py-1 rounded-full">
              <p className="text-blue-700 font-semibold text-sm">
                ${(machine.pricePerHour / 100).toFixed(2)}/hr
              </p>
            </div>
          )}
        </div>

        {machine.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {machine.description}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500">Available Units</p>
            <p className="text-lg font-bold text-gray-900">
              {machine.stats?.activeInstanceCount || 0}/
              {machine.stats?.instanceCount || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Active Bookings</p>
            <p className="text-lg font-bold text-gray-900">
              {machine.stats?.activeBookingCount || 0}
            </p>
          </div>
        </div>

        {/* Total Bookings Badge */}
        <div className="mt-4 flex items-center text-sm text-gray-600">
          <span className="mr-1">📊</span>
          {machine.stats?.bookingCount || 0} total bookings
        </div>
      </div>
    </Link>
  );
}
