import { View, Text, Pressable } from 'react-native'
import { useRouter, useSearchParams } from 'solito/navigation'
import { useTRPC } from '../../lib/trpc'
import { useQuery } from '@tanstack/react-query'

export function UserDetailScreen() {
  const router = useRouter()
  const params = useSearchParams()
  const trpc = useTRPC()
  const { data , isLoading, error } = useQuery(trpc.user.dummy.queryOptions())
  if (isLoading) return <Text>Loading...</Text>
  if (error) return <Text>Error: {error.message}</Text>
  if (!data) return <Text>No data</Text>
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Pressable onPress={() => router.back()}>
        <Text>👈 welcome, {params?.get('id')}! (press me to go back)</Text>
      </Pressable>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'red' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{JSON.stringify(data)}</Text>
      </View>
    </View>
  )
}
