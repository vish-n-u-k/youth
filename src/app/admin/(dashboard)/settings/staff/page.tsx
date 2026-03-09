'use client';

import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import { Users } from 'lucide-react';

export default function StaffRolesPage() {
  return (
    <Box>
      <Heading size="lg" mb="6">Staff & Roles</Heading>
      <Box
        borderWidth="1px"
        borderRadius="lg"
        p="8"
        bg="gray.50"
        _dark={{ bg: 'gray.800' }}
      >
        <Flex direction="column" align="center" justify="center" gap="3" py="6">
          <Users size={48} color="#a0aec0" />
          <Heading size="md" color="gray.600">Coming in Phase 2</Heading>
          <Text color="gray.500" textAlign="center" maxW="400px">
            Staff & Roles management will be available in Phase 2. You will be
            able to invite team members, assign roles, and manage permissions.
          </Text>
        </Flex>
      </Box>
    </Box>
  );
}
