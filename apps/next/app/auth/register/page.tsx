'use client'

import Head from 'next/head';
import { RegisterScreen } from 'app/features/auth/register';

export default function RegisterPage() {
  return (
    <>
      <Head>
        <title>Sign Up - Booktractor</title>
      </Head>
      <RegisterScreen />
    </>
  );
}
