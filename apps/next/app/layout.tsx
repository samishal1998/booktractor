import { StylesProvider } from './styles-provider'
import './globals.css'
import { Provider } from 'app/provider'

export const metadata = {
  title: 'Booktractor',
  description: 'Booktractor is a cross-platform machinery rental and booking platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col items-stretch">
        <StylesProvider>
          <Provider>{children}</Provider>
        </StylesProvider>
      </body>
    </html>
  )
}
