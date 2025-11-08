import './globals.css'

import { NativeNavigation } from '@booktractor/app/navigation/native'
import { Provider } from '@booktractor/app/provider'

export default function App() {
  return (
    <Provider>
      <NativeNavigation />
    </Provider>
  )
}
