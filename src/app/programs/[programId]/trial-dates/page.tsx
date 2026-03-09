'use client';

import { Box, Flex, Heading, Text, Button } from '@chakra-ui/react';
import { Calendar } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/client/components/ui/ScreenStates';

// --------------- Types ---------------

interface TrialDate {
  dateId: string;
  date: string;
  spotsRemaining: number;
}

// --------------- Helpers ---------------

function formatDateDisplay(dateStr: string): string {
  const d = new Date(`${dateStr  }T00:00:00`);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// --------------- Component ---------------

export default function TrialDatesPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;

  const [dates, setDates] = useState<TrialDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<{ dates: TrialDate[] }>(`/api/programs/${programId}/trial-dates`);
      setDates(data.dates);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load trial dates';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => { void fetchDates(); }, [fetchDates]);

  const handleSelect = (dateId: string) => {
    router.push(`/programs/${programId}/book-trial?dateId=${dateId}`);
  };

  // --------------- Render ---------------

  if (loading) {return <LoadingState message="Loading available dates..." />;}
  if (error) {return <ErrorState message={error} onRetry={() => void fetchDates()} />;}

  return (
    <Box maxW="600px" mx="auto" py="8" px="4">
      <Heading size="lg" mb="2">Available Trial Dates</Heading>
      <Text color="gray.500" mb="6">Select a date to book your trial class.</Text>

      {dates.length === 0 ? (
        <EmptyState
          title="No dates available"
          message="There are currently no trial dates available for this program. Please check back later."
          icon={<Calendar size={48} color="#a0aec0" />}
        />
      ) : (
        <Flex direction="column" gap="3">
          {dates.map((d) => (
            <Flex
              key={d.dateId}
              align="center"
              justify="space-between"
              p="4"
              borderWidth="1px"
              borderRadius="lg"
              _hover={{ borderColor: 'blue.300', bg: 'blue.50' }}
              transition="all 0.15s"
            >
              <Box>
                <Text fontWeight="600">{formatDateDisplay(d.date)}</Text>
                <Text fontSize="sm" color="gray.500">
                  {d.spotsRemaining} {d.spotsRemaining === 1 ? 'spot' : 'spots'} remaining
                </Text>
              </Box>
              <Button
                colorPalette="blue"
                size="sm"
                onClick={() => handleSelect(d.dateId)}
                disabled={d.spotsRemaining === 0}
              >
                {d.spotsRemaining === 0 ? 'Full' : 'Select'}
              </Button>
            </Flex>
          ))}
        </Flex>
      )}
    </Box>
  );
}
