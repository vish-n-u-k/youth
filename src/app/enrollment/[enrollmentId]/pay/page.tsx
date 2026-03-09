'use client';

import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import { CreditCard, Info } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState } from '@/client/components/ui/ScreenStates';

// --------------- Types ---------------

interface PaymentInstructions {
  programName: string;
  parentName: string;
  childName: string;
  amountDue: number;
  zelleRecipientName: string;
  zelleContactInfo: string;
  zelleInstructions: string | null;
}

// --------------- Component ---------------

export default function PaymentInstructionsPage() {
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;

  const [data, setData] = useState<PaymentInstructions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstructions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.get<PaymentInstructions>(
        `/api/public/enrollments/${enrollmentId}/payment-instructions`
      );
      setData(result);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load payment instructions';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => { void fetchInstructions(); }, [fetchInstructions]);

  // --------------- Render ---------------

  if (loading) {return <LoadingState message="Loading payment instructions..." />;}
  if (error) {return <ErrorState message={error} onRetry={() => void fetchInstructions()} />;}
  if (!data) {return <ErrorState message="Payment instructions not found" />;}

  return (
    <Flex justify="center" px="4" py="8">
      <Box maxW="520px" w="100%">
        {/* Program & enrollment info */}
        <Box borderWidth="1px" borderRadius="lg" p="6" mb="6" bg="white">
          <Flex align="center" gap="2" mb="4">
            <CreditCard size={24} color="#3182ce" />
            <Heading size="lg">Payment Details</Heading>
          </Flex>
          <Flex direction="column" gap="3">
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Program</Text>
              <Text fontWeight="500">{data.programName}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Child</Text>
              <Text fontWeight="500">{data.childName}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Parent</Text>
              <Text fontWeight="500">{data.parentName}</Text>
            </Box>
            <Box borderTopWidth="1px" pt="3" mt="1">
              <Text fontSize="xs" color="gray.500" fontWeight="600">Amount Due</Text>
              <Text fontSize="2xl" fontWeight="700" color="blue.600">
                ${data.amountDue.toFixed(2)}
              </Text>
            </Box>
          </Flex>
        </Box>

        {/* Zelle instructions */}
        <Box borderWidth="1px" borderRadius="lg" p="6" bg="white">
          <Heading size="md" mb="4">Zelle Payment Instructions</Heading>
          <Flex direction="column" gap="3">
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Send To</Text>
              <Text fontWeight="500">{data.zelleRecipientName}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Zelle Contact</Text>
              <Text fontWeight="500">{data.zelleContactInfo}</Text>
            </Box>
            {data.zelleInstructions && (
              <Box>
                <Text fontSize="xs" color="gray.500" fontWeight="600">Additional Instructions</Text>
                <Text>{data.zelleInstructions}</Text>
              </Box>
            )}
          </Flex>

          {/* Memo reminder */}
          <Box
            mt="5"
            p="4"
            borderRadius="md"
            bg="blue.50"
            borderWidth="1px"
            borderColor="blue.200"
          >
            <Flex gap="2" align="flex-start">
              <Box mt="0.5">
                <Info size={18} color="#3182ce" />
              </Box>
              <Text fontSize="sm" color="blue.800">
                Please include your child&apos;s name (<Text as="span" fontWeight="700">{data.childName}</Text>) in the Zelle memo so we can match your payment.
              </Text>
            </Flex>
          </Box>
        </Box>
      </Box>
    </Flex>
  );
}
