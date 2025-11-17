import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useTRPC } from '../../../lib/trpc'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useParams } from 'solito/router'
import { PriceDisplay } from '../../../components/shared/PriceDisplay'
import { useState } from 'react'

export function MachineDetailScreen() {
  const router = useRouter()
  const trpc = useTRPC()
  const params = useParams<{ id: string }>()
  const machineId = params?.id as string

  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null)
  const [requestedCount, setRequestedCount] = useState(1)

  const { data: machine, isLoading } = useQuery(
    trpc.client.machines.getDetails.queryOptions({
      id: machineId,
    })
  )

  const { data: availability } = useQuery({
    ...trpc.client.machines.checkAvailability.queryOptions({
      templateId: machineId,
      startTime: selectedStartDate?.toISOString() || new Date().toISOString(),
      endTime: selectedEndDate?.toISOString() || new Date(Date.now() + 86400000).toISOString(),
      requestedCount,
    }),
    enabled: !!selectedStartDate && !!selectedEndDate,
  })

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading equipment details...</Text>
      </View>
    )
  }

  if (!machine) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Equipment Not Found</Text>
        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 16, padding: 12, backgroundColor: '#3b82f6', borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    )
  }

  const handleBookNow = () => {
    if (!selectedStartDate || !selectedEndDate) {
      alert('Please select start and end dates')
      return
    }

    if (!availability?.available) {
      alert('Selected dates are not available')
      return
    }

    router.push(
      `/bookings/checkout?machineId=${machineId}&start=${selectedStartDate.toISOString()}&end=${selectedEndDate.toISOString()}&count=${requestedCount}`
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header Image Placeholder */}
      <View
        style={{
          height: 200,
          backgroundColor: '#e5e7eb',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 64 }}>🚜</Text>
      </View>

      {/* Content */}
      <View style={{ padding: 16 }}>
        {/* Title and Category */}
        <View style={{ marginBottom: 16 }}>
          {machine.category && (
            <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>
              {machine.category}
            </Text>
          )}
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
            {machine.name}
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>Code: {machine.code}</Text>
        </View>

        {/* Price */}
        {machine.pricePerHour && (
          <View
            style={{
              backgroundColor: '#eff6ff',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#1e40af', fontSize: 14, marginBottom: 4 }}>Starting at</Text>
            <PriceDisplay amount={machine.pricePerHour} />
            <Text style={{ color: '#1e40af', fontSize: 14 }}>per hour</Text>
          </View>
        )}

        {/* Description */}
        {machine.description && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Description</Text>
            <Text style={{ color: '#4b5563', lineHeight: 24 }}>{machine.description}</Text>
          </View>
        )}

        {/* Availability Section */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingTop: 24,
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
            Check Availability
          </Text>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
              Number of Units
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => setRequestedCount(num)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: requestedCount === num ? '#3b82f6' : '#f3f4f6',
                  }}
                >
                  <Text
                    style={{
                      color: requestedCount === num ? 'white' : '#374151',
                      fontWeight: '500',
                    }}
                  >
                    {num}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Date Selection Placeholder */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>Start Date</Text>
            <Pressable
              onPress={() => {
                // In a real app, this would open a date picker
                setSelectedStartDate(new Date())
              }}
              style={{
                padding: 12,
                backgroundColor: '#f3f4f6',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#d1d5db',
              }}
            >
              <Text style={{ color: selectedStartDate ? '#111827' : '#6b7280' }}>
                {selectedStartDate ? selectedStartDate.toLocaleDateString() : 'Select start date'}
              </Text>
            </Pressable>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>End Date</Text>
            <Pressable
              onPress={() => {
                // In a real app, this would open a date picker
                setSelectedEndDate(new Date(Date.now() + 7 * 86400000))
              }}
              style={{
                padding: 12,
                backgroundColor: '#f3f4f6',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#d1d5db',
              }}
            >
              <Text style={{ color: selectedEndDate ? '#111827' : '#6b7280' }}>
                {selectedEndDate ? selectedEndDate.toLocaleDateString() : 'Select end date'}
              </Text>
            </Pressable>
          </View>

          {/* Availability Result */}
          {selectedStartDate && selectedEndDate && availability && (
            <View
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: availability.available ? '#f0fdf4' : '#fef2f2',
                borderWidth: 1,
                borderColor: availability.available ? '#86efac' : '#fecaca',
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontWeight: 'bold',
                  color: availability.available ? '#166534' : '#991b1b',
                  marginBottom: 8,
                }}
              >
                {availability.available ? '✓ Available' : '✗ Not Available'}
              </Text>
              {availability.available ? (
                <View>
                  <Text style={{ color: '#166534', fontSize: 14 }}>
                    {availability.availableCount} unit(s) available
                  </Text>
                  {availability.totalCost && (
                    <Text style={{ color: '#166534', fontSize: 14, marginTop: 4 }}>
                      Total cost: ${(availability.totalCost / 100).toFixed(2)}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={{ color: '#991b1b', fontSize: 14 }}>
                  {availability.reason || 'Equipment not available for selected dates'}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Book Now Button */}
        <Pressable
          onPress={handleBookNow}
          disabled={!selectedStartDate || !selectedEndDate || !availability?.available}
          style={{
            backgroundColor:
              selectedStartDate && selectedEndDate && availability?.available
                ? '#3b82f6'
                : '#d1d5db',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold',
            }}
          >
            Book Now
          </Text>
        </Pressable>

        {/* Stats */}
        {machine.stats && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: '#e5e7eb',
              paddingTop: 24,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
              Equipment Stats
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>
                  {machine.stats.activeInstanceCount || 0}
                </Text>
                <Text style={{ color: '#6b7280', fontSize: 12 }}>Available</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981' }}>
                  {machine.stats.bookingCount || 0}
                </Text>
                <Text style={{ color: '#6b7280', fontSize: 12 }}>Total Bookings</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}
