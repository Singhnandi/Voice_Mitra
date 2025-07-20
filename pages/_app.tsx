// pages/_app.tsx

import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/context/AuthContext'; // 1. Import the provider

export default function App({ Component, pageProps }: AppProps) {
  return (
    // 2. Wrap your entire application with it
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}