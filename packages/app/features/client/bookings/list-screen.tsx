'use client'

import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native'
import { useTRPC } from '../../../lib/trpc'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'solito/navigation'
import { useSession } from '../../../lib/auth-client'
import { BookingStatusBadge } from '../../../components/shared/BookingStatusBadge'
import { EmptyState } from '../../../components/shared/EmptyState'
import { useState } from 'react'
import { BookingStatus } from '@booktractor/db/schemas'

type BookingStatusValue = (typeof BookingStatus)[keyof typeof BookingStatus]
type StatusFilter = 'all' | BookingStatusValue

export function BookingsListScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const trpc = useTRPC()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const statusParam: BookingStatusValue | undefined =
    statusFilter === 'all' ? undefined : statusFilter

  const { data: bookings, isLoading } = useQuery({
    ...trpc.client.bookings.myBookings.queryOptions({
      clientId: session?.user?.id || '',
      status: statusParam,
    }),
    enabled: !!session?.user?.id,
  })

  const handleBookingPress = (bookingId: string) => {
    router.push(`/bookings/${bookingId}`)
  }

  const normalizedBookings = bookings ?? []
  const pendingCount = normalizedBookings.filter((b) => b.status === 'pending_renter_approval').length
  const completedCount = normalizedBookings.filter((b) => b.status === 'approved_by_renter').length

  const filterOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending_renter_approval', label: 'Pending' },
    { key: 'approved_by_renter', label: 'Approved' },
    { key: 'sent_back_to_client', label: 'Needs Changes' },
    { key: 'canceled_by_client', label: 'Cancelled' },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>My Bookings</Text>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: '#eff6ff', padding: 12, borderRadius: 8 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e40af' }}>
              {pendingCount}
            </Text>
            <Text style={{ color: '#3b82f6', fontSize: 12 }}>Pending</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#166534' }}>
              {completedCount}
            </Text>
            <Text style={{ color: '#10b981', fontSize: 12 }}>Completed</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {filterOptions.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setStatusFilter(option.key)}
              style={{
                flexGrow: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: statusFilter === option.key ? '#3b82f6' : '#f3f4f6',
                alignItems: 'center',
                minWidth: '22%',
              }}
            >
              <Text
                style={{
                  color: statusFilter === option.key ? 'white' : '#374151',
                  fontWeight: '500',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading bookings...</Text>
        </View>
      ) : normalizedBookings.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No Bookings Yet"
          message={
            statusFilter !== 'all'
              ? `No ${filterOptions.find((opt) => opt.key === statusFilter)?.label.toLowerCase()} bookings found`
              : "You haven't made any bookings yet. Browse equipment to get started!"
          }
        />
      ) : (
        <FlatList
          data={normalizedBookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleBookingPress(item.id)}
              style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: '#e5e7eb',
              }}
            >
              {/* Booking ID and Status */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>
                  #{item.id.slice(0, 8)}
                </Text>
                <BookingStatusBadge status={item.status as BookingStatusValue} />
              </View>

              {/* Machine Info */}
              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>
                  Equipment: {item.machineName}
                </Text>
                <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                  Code: {item.machineCode}
                </Text>
              </View>

              {/* Date Range */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: '#6b7280', fontSize: 14 }}>📅 </Text>
                <Text style={{ color: '#374151', fontSize: 14 }}>
                  {new Date(item.startTime).toLocaleDateString()} -{' '}
                  {new Date(item.endTime).toLocaleDateString()}
                </Text>
              </View>

              {/* Units and Cost */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>
                  {item.instanceCode ? `Unit ${item.instanceCode}` : 'Unit assignment pending'}
                </Text>
                <Text style={{ fontWeight: 'bold', color: '#111827', fontSize: 16 }}>
                  ${(item.totalPrice / 100).toFixed(2)}
                </Text>
              </View>

              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                <Text style={{ color: '#6b7280', fontSize: 12 }}>
                  Payment status: {item.paymentStatus}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        onPress={() => router.push('/machines')}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          backgroundColor: '#3b82f6',
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Text style={{ fontSize: 24, color: 'white' }}>+</Text>
      </Pressable>
    </View>
  )
}
