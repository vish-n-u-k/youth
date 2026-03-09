'use client';

/**
 * @purpose Public layout for parent-facing pages (programs, booking, enrollment, payment)
 * @inputs children: ReactNode
 * @outputs Minimal layout with logo header and centered content area
 */

import { Box, Flex, Text } from '@chakra-ui/react';
import Link from 'next/link';

import type { ReactNode } from 'react';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <Box minH="100vh">
      <Flex
        as="header"
        align="center"
        h="56px"
        px="6"
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="white"
      >
        <Link href="/programs" style={{ textDecoration: 'none' }}>
          <Text fontWeight="bold" fontSize="lg" color="blue.600">Programs</Text>
        </Link>
      </Flex>
      <Box maxW="960px" mx="auto" px="4" py="8">
        {children}
      </Box>
    </Box>
  );
}
