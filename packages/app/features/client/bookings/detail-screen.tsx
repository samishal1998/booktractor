import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native'
import { useTRPC } from '../../../lib/trpc'
import { useRouter, useParams } from 'solito/router'
import { useSession } from '../../../lib/auth-client'
import { BookingStatusBadge } from '../../../components/shared/BookingStatusBadge'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

export function BookingDetailScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  const params = useParams<{ id: string }>()
  const bookingId = params?.id as string
  const trpc = useTRPC()

  const [message, setMessage] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  const { data: booking, isLoading, refetch } = useQuery({
    ...trpc.client.bookings.getById.queryOptions({
      id: bookingId,
      clientId: session?.user?.id || '',
    }),
    enabled: !!session?.user?.id && !!bookingId,
  })

  const sendMessageMutation = useMutation({
    ...trpc.client.bookings.sendMessage.mutationOptions(),
    onSuccess: () => {
      setMessage('')
      setIsSendingMessage(false)
      refetch()
    },
  })

  const cancelBookingMutation = useMutation({
    ...trpc.client.bookings.cancel.mutationOptions(),
    onSuccess: () => {
      refetch()
    },
  })

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading booking details...</Text>
      </View>
    )
  }

  if (!booking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Booking Not Found</Text>
        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 16, padding: 12, backgroundColor: '#3b82f6', borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    )
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return

    setIsSendingMessage(true)
    await sendMessageMutation.mutateAsync({
      bookingId,
      content: message.trim(),
      clientId: session?.user?.id || '',
    })
  }

  const handleCancelBooking = async () => {
    if (confirm('Are you sure you want to cancel this booking?')) {
      await cancelBookingMutation.mutateAsync({
        bookingId,
        clientId: session?.user?.id || '',
      })
    }
  }

  const canCancel = booking.status === 'pending' || booking.status === 'approved'

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              Booking #{bookingId.slice(0, 8)}
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
              Created {new Date(booking.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <BookingStatusBadge status={booking.status} />
        </View>
      </View>

      <View style={{ padding: 16 }}>
        {/* Booking Details Card */}
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#e5e7eb',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Booking Details</Text>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>Equipment</Text>
            <Pressable onPress={() => router.push(`/machines/${booking.machineTemplateId}`)}>
              <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: '500' }}>
                View Equipment Details →
              </Text>
            </Pressable>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>Date Range</Text>
            <Text style={{ color: '#111827', fontSize: 16 }}>
              {new Date(booking.startTime).toLocaleString()}
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 14 }}>to</Text>
            <Text style={{ color: '#111827', fontSize: 16 }}>
              {new Date(booking.endTime).toLocaleString()}
            </Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>Number of Units</Text>
            <Text style={{ color: '#111827', fontSize: 16 }}>
              {booking.machineInstanceIds?.length || 0} unit(s)
            </Text>
          </View>

          {booking.machineInstanceIds && booking.machineInstanceIds.length > 0 && (
            <View>
              <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>Assigned Units</Text>
              {booking.machineInstanceIds.map((instanceId) => (
                <View
                  key={instanceId}
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: 8,
                    borderRadius: 6,
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ color: '#374151', fontSize: 14 }}>
                    Unit: {instanceId.slice(0, 8)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Payment Summary Card */}
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#e5e7eb',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Payment Summary</Text>

          <View style={{ marginBottom: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text style={{ color: '#6b7280', fontSize: 14 }}>Subtotal</Text>
              <Text style={{ color: '#111827', fontSize: 14 }}>
                ${(booking.totalCost / 100).toFixed(2)}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '500' }}>Deposit Paid</Text>
              <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '500' }}>
                ${(booking.depositPaid / 100).toFixed(2)}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: '#e5e7eb',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Total</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                ${(booking.totalCost / 100).toFixed(2)}
              </Text>
            </View>

            {booking.totalCost - booking.depositPaid > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 8,
                }}
              >
                <Text style={{ color: '#f59e0b', fontSize: 14, fontWeight: '500' }}>
                  Balance Due
                </Text>
                <Text style={{ color: '#f59e0b', fontSize: 14, fontWeight: '500' }}>
                  ${((booking.totalCost - booking.depositPaid) / 100).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Messages Card */}
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#e5e7eb',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Communication</Text>

          {booking.messages && booking.messages.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              {booking.messages.map((msg, idx) => (
                <View
                  key={idx}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: msg.from === 'client' ? '#eff6ff' : '#f9fafb',
                    marginBottom: 8,
                    alignSelf: msg.from === 'client' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontWeight: '600', color: '#111827', fontSize: 12 }}>
                      {msg.from === 'client' ? 'You' : 'Owner'}
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: 10 }}>
                      {new Date(msg.sentAt).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={{ color: '#374151', fontSize: 14 }}>{msg.text}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
              No messages yet
            </Text>
          )}

          {/* Send Message Form */}
          <View>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message..."
              multiline
              style={{
                backgroundColor: '#f9fafb',
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                marginBottom: 8,
                minHeight: 60,
              }}
            />
            <Pressable
              onPress={handleSendMessage}
              disabled={!message.trim() || isSendingMessage}
              style={{
                backgroundColor: message.trim() && !isSendingMessage ? '#3b82f6' : '#d1d5db',
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>
                {isSendingMessage ? 'Sending...' : 'Send Message'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Actions */}
        {canCancel && (
          <Pressable
            onPress={handleCancelBooking}
            disabled={cancelBookingMutation.isPending}
            style={{
              backgroundColor: '#ef4444',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              marginBottom: 32,
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
              {cancelBookingMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  )
}
