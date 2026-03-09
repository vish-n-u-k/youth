'use client';

import { Box, Flex, Heading, Text, Button } from '@chakra-ui/react';
import { CheckCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState } from '@/client/components/ui/ScreenStates';

// --------------- Types ---------------

interface ConfirmationData {
  enrollmentId: string;
  programName: string;
  parentName: string;
  childName: string;
  totalDue: number;
  paymentStatus: string;
  enrolledAt: string;
}

// --------------- Component ---------------

export default function EnrollmentConfirmedPage() {
  const router = useRouter();
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const [data, setData] = useState<ConfirmationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfirmation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.get<ConfirmationData>(`/api/public/enrollments/${enrollmentId}/confirmation`);
      setData(result);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load confirmation';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => { void fetchConfirmation(); }, [fetchConfirmation]);

  // --------------- Render ---------------

  if (loading) {return <LoadingState message="Loading confirmation..." />;}
  if (error) {return <ErrorState message={error} onRetry={() => void fetchConfirmation()} />;}
  if (!data) {return <ErrorState message="Confirmation not found" />;}

  return (
    <Box maxW="500px" mx="auto" py="12" px="4" textAlign="center">
      <Flex justify="center" mb="4">
        <CheckCircle size={64} color="#38a169" />
      </Flex>

      <Heading size="xl" mb="2">Enrollment Confirmed!</Heading>
      <Text color="gray.500" mb="8">
        Welcome aboard! Here are your enrollment details.
      </Text>

      <Box borderWidth="1px" borderRadius="xl" p="6" textAlign="left" bg="white" shadow="sm" mb="8">
        <Flex direction="column" gap="3" fontSize="sm">
          <Flex justify="space-between">
            <Text fontWeight="600" color="gray.600">Program</Text>
            <Text fontWeight="500">{data.programName}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text fontWeight="600" color="gray.600">Child</Text>
            <Text>{data.childName}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text fontWeight="600" color="gray.600">Parent</Text>
            <Text>{data.parentName}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text fontWeight="600" color="gray.600">Enrolled</Text>
            <Text>{new Date(data.enrolledAt).toLocaleDateString()}</Text>
          </Flex>
          <Box borderTopWidth="1px" pt="3" mt="1">
            <Flex justify="space-between">
              <Text fontWeight="700">Amount Due</Text>
              <Text fontWeight="700" fontSize="md">${data.totalDue.toFixed(2)}</Text>
            </Flex>
          </Box>
        </Flex>
      </Box>

      <Button
        colorPalette="green"
        size="lg"
        w="100%"
        onClick={() => router.push(`/enrollment/${enrollmentId}/pay`)}
      >
        Proceed to Payment
      </Button>
    </Box>
  );
}
