import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native'
import { useTRPC } from '../../../lib/trpc'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'solito/router'
import { useSession } from '../../../lib/auth-client'
import { BookingStatusBadge } from '../../../components/shared/BookingStatusBadge'
import { EmptyState } from '../../../components/shared/EmptyState'
import { useState } from 'react'

export function BookingsListScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const trpc = useTRPC()
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all')

  const { data: bookings, isLoading } = useQuery({
    ...trpc.client.bookings.myBookings.queryOptions({
      clientId: session?.user?.id || '',
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    enabled: !!session?.user?.id,
  })

  const handleBookingPress = (bookingId: string) => {
    router.push(`/bookings/${bookingId}`)
  }

  const pendingCount = bookings?.filter((b) => b.status === 'pending' || b.status === 'approved').length || 0
  const completedCount = bookings?.filter((b) => b.status === 'completed').length || 0

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
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setStatusFilter('all')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: statusFilter === 'all' ? '#3b82f6' : '#f3f4f6',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: statusFilter === 'all' ? 'white' : '#374151', fontWeight: '500' }}>
              All
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setStatusFilter('pending')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: statusFilter === 'pending' ? '#3b82f6' : '#f3f4f6',
              alignItems: 'center',
            }}
          >
            <Text
              style={{ color: statusFilter === 'pending' ? 'white' : '#374151', fontWeight: '500' }}
            >
              Pending
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setStatusFilter('completed')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: statusFilter === 'completed' ? '#3b82f6' : '#f3f4f6',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: statusFilter === 'completed' ? 'white' : '#374151',
                fontWeight: '500',
              }}
            >
              Completed
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading bookings...</Text>
        </View>
      ) : !bookings || bookings.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No Bookings Yet"
          message={
            statusFilter !== 'all'
              ? `No ${statusFilter} bookings found`
              : "You haven't made any bookings yet. Browse equipment to get started!"
          }
        />
      ) : (
        <FlatList
          data={bookings}
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
                <BookingStatusBadge status={item.status} />
              </View>

              {/* Machine Info */}
              <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>
                Equipment ID: {item.machineTemplateId.slice(0, 8)}
              </Text>

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
                  {item.machineInstanceIds?.length || 0} unit(s)
                </Text>
                <Text style={{ fontWeight: 'bold', color: '#111827', fontSize: 16 }}>
                  ${(item.totalCost / 100).toFixed(2)}
                </Text>
              </View>

              {/* Deposit Info */}
              {item.depositPaid > 0 && (
                <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                  <Text style={{ color: '#10b981', fontSize: 12 }}>
                    Deposit paid: ${(item.depositPaid / 100).toFixed(2)}
                  </Text>
                </View>
              )}
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
