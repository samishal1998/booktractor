'use client';

import { View, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { useRouter } from 'solito/navigation';
import { MachineCard, LoadingSpinner, EmptyState } from '../../../components/shared';
import { useTRPC } from '../../../lib/trpc';
import { useQuery } from '@tanstack/react-query';

export function ClientHomeScreen() {
  const router = useRouter();
  const trpc = useTRPC()
  const { data: featured, isLoading } = useQuery(trpc.client.machines.featured.queryOptions());

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading featured machines..." />;
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-600 pt-12 pb-8 px-4">
        <Text className="text-white text-3xl font-bold mb-2">
          Find Equipment
        </Text>
        <Text className="text-blue-100 text-base">
          Rent machinery for your next project
        </Text>

        {/* Search Bar */}
        <Pressable
          onPress={() => router.push('/search')}
          className="bg-white rounded-lg mt-6 px-4 py-3 flex-row items-center"
        >
          <Text className="text-gray-400 mr-2">🔍</Text>
          <Text className="text-gray-400 flex-1">Search equipment...</Text>
        </Pressable>
      </View>

      {/* Categories */}
      <View className="px-4 py-6">
        <Text className="text-lg font-bold text-gray-900 mb-4">
          Browse by Category
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['Excavators', 'Loaders', 'Bulldozers', 'Cranes', 'Trucks'].map((category) => (
            <Pressable
              key={category}
              className="bg-white rounded-lg px-6 py-4 mr-3 shadow-sm border border-gray-200"
            >
              <Text className="text-gray-700 font-medium">{category}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Featured Machines */}
      <View className="px-4 pb-6">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-gray-900">
            Featured Equipment
          </Text>
          <Pressable onPress={() => router.push('/search')}>
            <Text className="text-blue-600 font-medium">See All →</Text>
          </Pressable>
        </View>

        {!featured || featured.length === 0 ? (
          <EmptyState
            icon="🏗️"
            title="No Equipment Available"
            message="Check back later for available equipment"
          />
        ) : (
          <View>
            {featured.map((machine) => (
              <MachineCard
                key={machine.id}
                id={machine.id}
                name={machine.name}
                code={machine.code}
                description={machine.description}
                pricePerHour={machine.pricePerHour}
                availableCount={machine.availableCount}
                onPress={() => router.push(`/machines/${machine.id}`)}
              />
            ))}
          </View>
        )}
      </View>

      {/* How It Works */}
      <View className="bg-white px-4 py-8 mb-8">
        <Text className="text-xl font-bold text-gray-900 mb-6 text-center">
          How It Works
        </Text>
        <View className="space-y-6">
          {[
            { icon: '🔍', title: 'Search', desc: 'Find the right equipment for your project' },
            { icon: '📅', title: 'Book', desc: 'Select dates and request a booking' },
            { icon: '✅', title: 'Confirm', desc: 'Owner approves and you pay securely' },
            { icon: '🚜', title: 'Use', desc: 'Pick up and complete your project' },
          ].map((step, index) => (
            <View key={index} className="flex-row items-start">
              <Text className="text-4xl mr-4">{step.icon}</Text>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">{step.title}</Text>
                <Text className="text-gray-600 mt-1">{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
