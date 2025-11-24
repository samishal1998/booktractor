import './globals.css'

import { NativeNavigation } from '@booktractor/app/navigation/native'
import { Provider } from '@booktractor/app/provider'
import { StatusBar } from 'expo-status-bar'

export default function App() {
  return (
    <Provider>
      <StatusBar style="light" backgroundColor="#6366f1" />
      <NativeNavigation />
    </Provider>
  )
}
