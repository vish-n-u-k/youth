'use client';

import { Flex, Box, Heading, Text } from '@chakra-ui/react';
import Link from 'next/link';

export default function ParentLoginPage() {
  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Box w="100%" maxW="400px" p="8" bg="white" borderRadius="lg" boxShadow="md" textAlign="center">
        <Heading as="h2" size="lg" mb="4">
          Parent Login
        </Heading>
        <Text color="gray.500" mb="4">
          Parent login will be available in Phase 2.
        </Text>
        <Text fontSize="sm">
          <Link href="/programs" style={{ color: '#3182ce' }}>
            Browse Programs
          </Link>
        </Text>
      </Box>
    </Flex>
  );
}
