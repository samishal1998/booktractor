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
      <H1 className="text-2xl font-bold text-center">Welcome to Solito.</H1>
      <View className="max-w-600 gap-4">
        <Text className="text-center">
          Here is a basic starter to show you how you can navigate from one
          screen to another. This screen uses the same code on Next.js and React
          Native.
        </Text>
        <Text className="text-center">
          Solito is made by{' '}
          <TextLink
            href="https://twitter.com/fernandotherojo"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'blue' }}
          >
            Fernando Rojo
          </TextLink>
          .
        </Text>
      </View>
      <View className="flex-row gap-8">
        <Text className="text-white font-medium text-xl p-2 rounded-lg bg-blue-500 hover:bg-blue-600">
          <TextLink href="/users/fernando">Link</TextLink>
        </Text>
        {!session ? (
          <Text className="text-white font-medium text-xl p-2 rounded-lg bg-blue-500 hover:bg-blue-600">
            <TextLink href="/auth/login">Sign In</TextLink>
          </Text>
        ) : (
          <Text
            className="text-white font-medium text-xl p-2 rounded-lg bg-blue-500 hover:bg-blue-600"
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
