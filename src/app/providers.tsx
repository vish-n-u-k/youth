'use client';

// ============================================
// APP PROVIDERS
// ============================================
// Wrap the app with all necessary context providers

import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { type ReactNode } from 'react';


import { AuthProvider } from '@/client/lib/auth-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ChakraProvider value={defaultSystem}>
      <AuthProvider>{children}</AuthProvider>
    </ChakraProvider>
  );
}
