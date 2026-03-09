'use client';

import { Box, Flex, Heading, Text, Button, Badge } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/client/components/ui/ScreenStates';

// --------------- Types ---------------

interface PublicProgram {
  programId: string;
  name: string;
  ageGroupMin: number;
  ageGroupMax: number;
  schedule: string;
  totalFee: number;
  trialAvailable: boolean;
  isFull: boolean;
  enrollmentOpen: boolean;
}

interface PublicProgramsResponse {
  programs: PublicProgram[];
}

// --------------- Component ---------------

export default function AvailableProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<PublicProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<PublicProgramsResponse>('/api/public/programs');
      setPrograms(data.programs);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load programs';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPrograms(); }, [fetchPrograms]);

  // --------------- Render ---------------

  if (loading) {return <LoadingState message="Loading programs..." />;}
  if (error) {return <ErrorState message={error} onRetry={() => void fetchPrograms()} />;}
  if (programs.length === 0) {
    return (
      <EmptyState
        title="No programs available"
        message="Check back later for upcoming programs."
      />
    );
  }

  return (
    <Box maxW="1000px" mx="auto" py="8" px="4">
      <Heading size="xl" mb="2" textAlign="center">Our Programs</Heading>
      <Text color="gray.500" textAlign="center" mb="8">
        Find the right program for your child
      </Text>

      <Flex gap="6" flexWrap="wrap" justify="center">
        {programs.map((p) => (
          <Box
            key={p.programId}
            borderWidth="1px"
            borderRadius="xl"
            p="6"
            w="300px"
            bg="white"
            shadow="sm"
            _hover={{ shadow: 'md' }}
            transition="box-shadow 0.2s"
            position="relative"
          >
            {/* Badges */}
            <Flex gap="2" mb="3">
              {p.trialAvailable && (
                <Badge colorPalette="blue" fontSize="xs">Trial Available</Badge>
              )}
              {p.isFull && (
                <Badge colorPalette="red" fontSize="xs">Full</Badge>
              )}
            </Flex>

            <Heading size="md" mb="2">{p.name}</Heading>
            <Text fontSize="sm" color="gray.500" mb="1">
              Ages {p.ageGroupMin}–{p.ageGroupMax}
            </Text>
            <Text fontSize="sm" color="gray.500" mb="3">{p.schedule}</Text>
            <Text fontSize="xl" fontWeight="700" mb="4">
              ${p.totalFee.toFixed(2)}
            </Text>

            <Flex direction="column" gap="2">
              <Button
                colorPalette="blue"
                size="sm"
                w="100%"
                disabled={!p.trialAvailable || p.isFull}
                onClick={() => router.push(`/programs/${p.programId}/book-trial`)}
              >
                Book Trial
              </Button>
              <Button
                colorPalette="green"
                size="sm"
                w="100%"
                disabled={!p.enrollmentOpen || p.isFull}
                onClick={() => router.push(`/programs/${p.programId}/enroll`)}
              >
                Enroll Now
              </Button>
            </Flex>
          </Box>
        ))}
      </Flex>
    </Box>
  );
}
