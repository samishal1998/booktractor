'use client'

import { TextLink } from 'solito/link'
import { Text, TextProps, View } from 'react-native'
import { useRouter } from 'solito/navigation'
import { useSession, signOut } from '../../lib/auth-client'

export function HomeScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  return (
    <View className="flex-1 flex flex-col justify-center items-center p-4 gap-8 w-auto">
      <H1 className="text-2xl font-bold text-center">Welcome to Booktractor</H1>

      <View className="max-w-600 gap-4">
        <Text className="text-center text-lg">
          Rent equipment for your projects. Browse available machinery and manage your bookings.
        </Text>
      </View>

      {/* Main Navigation Cards */}
      <View className="gap-4 w-full max-w-md">
        <Text className="text-white font-medium text-xl p-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-center">
          <TextLink href="/machines">🚜 Browse Equipment</TextLink>
        </Text>

        <Text className="text-white font-medium text-xl p-4 rounded-lg bg-green-600 hover:bg-green-700 text-center">
          <TextLink href="/bookings">📋 My Bookings</TextLink>
        </Text>

        <Text className="text-white font-medium text-xl p-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-center">
          <TextLink href="/profile">👤 My Profile</TextLink>
        </Text>
      </View>

      {/* Secondary Actions */}
      <View className="flex-row gap-4 flex-wrap justify-center">
        <Text className="text-white font-medium text-base px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700">
          <TextLink href="/users/fernando">Demo User</TextLink>
        </Text>

        {!session ? (
          <Text className="text-white font-medium text-base px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700">
            <TextLink href="/auth/login">Sign In</TextLink>
          </Text>
        ) : (
          <Text
            className="text-white font-medium text-base px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700"
            onPress={() => {
              console.log('signing out')
              signOut({
                query: {
                  onSuccess: () => {
                    router.push('/')
                  },
                  onError: (ctx: any) => {
                    console.error(ctx.error.message || 'Failed to sign out')
                  },
                },
              })
            }}
          >
            Sign Out
          </Text>
        )}
      </View>

      {/* Owner Dashboard Link */}
      <View className="mt-8 pt-8 border-t border-gray-300">
        <Text className="text-gray-600 text-sm text-center mb-2">
          Equipment Owner?
        </Text>
        <Text className="text-blue-600 font-medium text-base px-4 py-2 rounded-lg border-2 border-blue-600 hover:bg-blue-50 text-center">
          <TextLink href="/owner">Owner Dashboard</TextLink>
        </Text>
      </View>
    </View>
  )
}

const H1 = ({
  children,
  ...props
}: { children: React.ReactNode } & TextProps) => {
  return (
    <Text style={{ fontWeight: '800', fontSize: 24 }} {...props}>
      {children}
    </Text>
  )
}

const P = ({ children }: { children: React.ReactNode }) => {
  return <Text style={{ textAlign: 'center' }}>{children}</Text>
}
