import { HomeScreen } from '@booktractor/app/features/home/screen'
import Head from 'next/head'

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Booktractor - Equipment Rental Platform</title>
        <meta
          name="description"
          content="Rent construction equipment easily with Booktractor"
        />
      </Head>
      <HomeScreen />
    </>
  )
}
