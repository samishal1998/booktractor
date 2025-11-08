import { View, Text, Pressable } from 'react-native'
import { useRouter, useSearchParams } from 'solito/navigation'
import { useTRPC } from '#trpc'
import { useQuery } from '@tanstack/react-query'

export function UserDetailScreen() {
  const router = useRouter()
  const params = useSearchParams()
  const trpc = useTRPC()
  const { data } = useQuery(trpc.user.dummy.queryOptions())
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
