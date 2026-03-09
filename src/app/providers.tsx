'use client';

// ============================================
// APP PROVIDERS
// ============================================
// Wrap the app with all necessary context providers

import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import {
  Toaster,
  ToastRoot,
  ToastTitle,
  ToastDescription,
  ToastCloseTrigger,
} from '@chakra-ui/react/toast';
import { type ReactNode } from 'react';

import { AuthProvider } from '@/client/lib/auth-context';
import { toaster } from '@/client/lib/toaster';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ChakraProvider value={defaultSystem}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster toaster={toaster}>
        {(toast) => (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <ToastRoot {...{ toast } as any}>
            <ToastTitle />
            <ToastDescription />
            <ToastCloseTrigger />
          </ToastRoot>
        )}
      </Toaster>
    </ChakraProvider>
  );
}
