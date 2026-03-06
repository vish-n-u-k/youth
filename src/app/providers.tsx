'use client';

// ============================================
// APP PROVIDERS
// ============================================
// Wrap the app with all necessary context providers

import { type ReactNode } from 'react';

import { ChakraProvider } from '@chakra-ui/react';

import { AuthProvider } from '@/client/lib/auth-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ChakraProvider>
      <AuthProvider>{children}</AuthProvider>
    </ChakraProvider>
  );
}
