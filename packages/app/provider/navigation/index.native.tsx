import { NavigationContainer } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { useMemo } from 'react'

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NavigationContainer
      linking={useMemo(
        () => ({
          prefixes: [Linking.createURL('/')],
          config: {
            initialRouteName: 'home',
            screens: {
              home: '',
              'user-detail': 'users/:id',
              'profile': 'profile',
              'auth-login': 'auth/login',
              'auth-register': 'auth/register',
              'machines': 'machines',
              'machine-detail': 'machines/:id',
              'bookings': 'bookings',
              'booking-detail': 'bookings/:id',
            },
          },
        }),
        []
      )}
    >
      {children}
    </NavigationContainer>
  )
}
