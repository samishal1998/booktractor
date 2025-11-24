'use client'
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native'
import { useTRPC } from '../../../lib/trpc'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'solito/navigation'
import { MachineCard } from '../../../components/shared/MachineCard'
import { EmptyState } from '../../../components/shared/EmptyState'

export function MachineBrowseScreen() {
  const router = useRouter()
  const trpc = useTRPC()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()

  const { data: featured, isLoading: featuredLoading } = useQuery(
    trpc.client.machines.featured.queryOptions()
  )

  const { data: searchResults, isLoading: searchLoading } = useQuery(
    trpc.client.machines.search.queryOptions({
      query: searchQuery || undefined,
    })
  )

  const categories = [
    { id: 'tractor', label: 'Tractors' },
    { id: 'excavator', label: 'Excavators' },
    { id: 'bulldozer', label: 'Bulldozers' },
    { id: 'loader', label: 'Loaders' },
  ]

  const displayData = searchQuery ? searchResults : featured
  const filteredMachines = (displayData ?? []).filter((machine) => {
    if (!selectedCategory) return true
    const category =
      typeof machine.specs?.category === 'string'
        ? machine.specs.category.toLowerCase()
        : undefined
    return category === selectedCategory
  })

  const renderMachineCard = (item: any) => {
    const imageUrl = Array.isArray(item.specs?.images) && item.specs.images.length > 0
      ? item.specs.images[0]
      : undefined

    return (
      <MachineCard
        id={item.id}
        name={item.name}
        code={item.code}
        description={item.description}
        pricePerHour={item.pricePerHour}
        availableCount={item.availableCount ?? 0}
        imageUrl={imageUrl}
        onPress={() => handleMachinePress(item.id)}
      />
    )
  }

  const handleMachinePress = (machineId: string) => {
    router.push(`/machines/${machineId}`)
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Browse Equipment</Text>

        {/* Search Bar */}
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search equipment..."
          style={{
            backgroundColor: '#f3f4f6',
            padding: 12,
            borderRadius: 8,
            fontSize: 16,
            marginBottom: 12,
          }}
        />

        {/* Category Filters */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Pressable
            onPress={() => setSelectedCategory(undefined)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: !selectedCategory ? '#3b82f6' : '#e5e7eb',
            }}
          >
            <Text style={{ color: !selectedCategory ? 'white' : '#374151', fontWeight: '500' }}>
              All
            </Text>
          </Pressable>

      {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: selectedCategory === cat.id ? '#3b82f6' : '#e5e7eb',
              }}
            >
              <Text
                style={{
                  color: selectedCategory === cat.id ? 'white' : '#374151',
                  fontWeight: '500',
                }}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Content */}
      {(featuredLoading || searchLoading) ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading equipment...</Text>
        </View>
      ) : filteredMachines.length === 0 ? (
        <EmptyState
          icon="🚜"
          title="No Equipment Found"
          message={
            searchQuery
              ? 'Try adjusting your search or filters'
              : 'No equipment available at the moment'
          }
        />
      ) : (
        <FlatList
          data={filteredMachines}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          renderItem={({ item }) => renderMachineCard(item)}
        />
      )}
    </View>
  )
}
