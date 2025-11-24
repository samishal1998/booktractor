import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { HomeScreen } from '../../features/home/screen'
import { UserDetailScreen } from '../../features/user/detail-screen'
import { ProfileScreen } from '../../features/user/profile-screen'
import { RegisterScreen } from '../../features/auth/register/screen'
import { LoginScreen } from '../../features/auth/login/screen'
import { MachineBrowseScreen } from '../../features/client/machines/browse-screen'
import { MachineDetailScreen } from '../../features/client/machines/detail-screen'
import { BookingsListScreen } from '../../features/client/bookings/list-screen'
import { BookingDetailScreen } from '../../features/client/bookings/detail-screen'

const Stack = createNativeStackNavigator<{
  home: undefined
  'user-detail': {
    id: string
  }
  'profile': undefined
  'auth-login': undefined
  'auth-register': undefined
  'machines': undefined
  'machine-detail': {
    id: string
  }
  'bookings': undefined
  'booking-detail': {
    id: string
  }
}>()

export function NativeNavigation() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6366f1',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="home"
        component={HomeScreen}
        options={{
          headerShown: false, // Hide system header for custom action bar
        }}
      />
      <Stack.Screen
        name="user-detail"
        component={UserDetailScreen}
        options={{
          title: 'User',
        }}
      />
      <Stack.Screen
        name="profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
        }}
      />
      <Stack.Screen
        name="auth-login"
        component={LoginScreen}
        options={{
          title: 'Login',
        }}
      />
      <Stack.Screen
        name="auth-register"
        component={RegisterScreen}
        options={{
          title: 'Register',
        }}
      />
      <Stack.Screen
        name="machines"
        component={MachineBrowseScreen}
        options={{
          title: 'Browse Equipment',
        }}
      />
      <Stack.Screen
        name="machine-detail"
        component={MachineDetailScreen}
        options={{
          title: 'Equipment Details',
        }}
      />
      <Stack.Screen
        name="bookings"
        component={BookingsListScreen}
        options={{
          title: 'My Bookings',
        }}
      />
      <Stack.Screen
        name="booking-detail"
        component={BookingDetailScreen}
        options={{
          title: 'Booking Details',
        }}
      />
    </Stack.Navigator>
  )
}
