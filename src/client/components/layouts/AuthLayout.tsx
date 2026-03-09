'use client';

/**
 * @purpose Centered layout for auth pages (login, forgot-password, reset-password)
 * @inputs children: ReactNode
 * @outputs Minimal centered layout wrapped with AuthRedirect
 */

import { Box, Flex } from '@chakra-ui/react';

import { AuthRedirect } from '@/client/components/auth/AuthRedirect';

import type { ReactNode } from 'react';


interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <AuthRedirect>
      <Flex minH="100vh" align="center" justify="center" bg="gray.50">
        <Box w="100%" maxW="400px" p="8" bg="white" borderRadius="lg" boxShadow="md">
          {children}
        </Box>
      </Flex>
    </AuthRedirect>
  );
}
