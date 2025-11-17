'use client';

import { useTRPC } from '@booktractor/app/lib/trpc';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@booktractor/app/lib/auth-client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
export default function OwnerBookingsPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const machineFilter = searchParams?.get('machine');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const trpc = useTRPC();

  const { data: bookings, isLoading } = useQuery({
    ...trpc.owner.bookings.listAll.queryOptions({
      ownerId: session?.user?.id || '',
      status: statusFilter === 'all' ? undefined : (statusFilter as any),
    }),
    enabled: !!session?.user?.id,
  });

  const bookingList = (bookings ?? []) as Array<any>;
  const filteredBookings = machineFilter
    ? bookingList.filter((b: any) => b.templateId === machineFilter)
    : bookingList;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_renter_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved_by_renter':
        return 'bg-green-100 text-green-800';
      case 'sent_back_to_client':
        return 'bg-blue-100 text-blue-800';
      case 'rejected_by_renter':
        return 'bg-red-100 text-red-800';
      case 'canceled_by_client':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600 mt-1">
            Manage all equipment booking requests
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Filter by:</span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {machineFilter && (
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
              <span className="text-sm text-blue-800">
                Filtered by machine
              </span>
              <Link
                href="/owner/bookings"
                className="text-blue-600 hover:text-blue-700"
              >
                ✕
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {filteredBookings.length}
          </p>
        </div>

        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <p className="text-sm text-yellow-800">Pending Approval</p>
          <p className="text-2xl font-bold text-yellow-900 mt-1">
            {filteredBookings.filter((b: any) => b.status === 'pending_renter_approval').length}
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <p className="text-sm text-blue-800">Active</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {filteredBookings.filter((b: any) => b.status === 'sent_back_to_client').length}
          </p>
        </div>

        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <p className="text-sm text-green-800">Completed</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {filteredBookings.filter((b: any) => b.status === 'approved_by_renter').length}
          </p>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No Bookings Found
          </h3>
          <p className="text-gray-600">
            {statusFilter !== 'all'
              ? `No ${statusFilter} bookings at the moment`
              : 'No bookings have been made yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking: any) => {
                  const durationHours =
                    (new Date(booking.endTime).getTime() -
                      new Date(booking.startTime).getTime()) /
                    (1000 * 60 * 60);
                  const estimatedTotal = booking.pricePerHour
                    ? Math.max(1, durationHours) * booking.pricePerHour
                    : null;
                  return (
                  <tr
                    key={booking.id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        #{booking.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/owner/machines/${booking.templateId}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {booking.machineName ?? 'View Machine'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {booking.clientName ?? `Client ${booking.clientAccountId.slice(0, 8)}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(booking.startTime).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        to {new Date(booking.endTime).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {booking.instanceCode ? 1 : booking.machineInstanceId ? 1 : 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {estimatedTotal ? `$${(estimatedTotal / 100).toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/owner/bookings/${booking.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
