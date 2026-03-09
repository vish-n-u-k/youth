'use client';

import { Box, Flex, Heading, Text, Button } from '@chakra-ui/react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState } from '@/client/components/ui/ScreenStates';
import { toaster } from '@/client/lib/toaster';

// --------------- Types ---------------

interface ProgramDetail {
  programId: string;
  name: string;
  ageGroupMin: number;
  ageGroupMax: number;
  totalFee: number;
  trialAvailable: boolean;
}

interface TrialBookingResponse {
  trialId: string;
  programName: string;
  trialDate: string;
  parentName: string;
  childName: string;
  confirmationEmailSent: boolean;
  message: string;
}

const fieldStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', background: 'white', width: '100%',
};

// --------------- Component ---------------

export default function BookTrialPage() {
  const router = useRouter();
  const { programId } = useParams<{ programId: string }>();
  const searchParams = useSearchParams();
  const dateId = searchParams.get('dateId') ?? '';

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<TrialBookingResponse | null>(null);

  // Form state
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [trialDateId] = useState(dateId);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchProgram = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<ProgramDetail>(`/api/public/programs/${programId}`);
      setProgram(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load program';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => { void fetchProgram(); }, [fetchProgram]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void doSubmit();
  };
  const doSubmit = async () => {
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!parentName.trim()) {errors.parentName = 'Parent name is required';}
    if (!parentEmail.trim()) {errors.parentEmail = 'Email is required';}
    if (!parentPhone.trim()) {errors.parentPhone = 'Phone is required';}
    if (!childName.trim()) {errors.childName = 'Child name is required';}
    if (!childAge.trim() || isNaN(Number(childAge))) {errors.childAge = 'Valid age is required';}

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const result = await api.post<TrialBookingResponse>('/api/public/trials', {
        programId,
        parentName: parentName.trim(),
        parentEmail: parentEmail.trim(),
        parentPhone: parentPhone.trim(),
        childName: childName.trim(),
        childAge: Number(childAge),
        trialDateId: trialDateId || undefined,
      });
      setConfirmation(result);
      toaster.success({ title: 'Trial booked!', description: result.message });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === 'object') {
          setFieldErrors(err.details as Record<string, string>);
        }
        toaster.error({ title: 'Booking failed', description: err.message });
      } else {
        toaster.error({ title: 'Booking failed', description: 'An unexpected error occurred.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --------------- Render ---------------

  if (loading) {return <LoadingState message="Loading program..." />;}
  if (error) {return <ErrorState message={error} onRetry={() => void fetchProgram()} />;}
  if (!program) {return <ErrorState message="Program not found" />;}

  // Confirmation view
  if (confirmation) {
    return (
      <Box maxW="500px" mx="auto" py="10" px="4" textAlign="center">
        <Flex justify="center" mb="4">
          <CheckCircle size={56} color="#38a169" />
        </Flex>
        <Heading size="lg" mb="2">Trial Booked!</Heading>
        <Text color="gray.500" mb="6">{confirmation.message}</Text>
        <Box borderWidth="1px" borderRadius="lg" p="5" textAlign="left" fontSize="sm" mb="6">
          <Flex direction="column" gap="2">
            <Flex justify="space-between">
              <Text fontWeight="600" color="gray.600">Program</Text>
              <Text>{confirmation.programName}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontWeight="600" color="gray.600">Child</Text>
              <Text>{confirmation.childName}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontWeight="600" color="gray.600">Parent</Text>
              <Text>{confirmation.parentName}</Text>
            </Flex>
            {confirmation.trialDate && (
              <Flex justify="space-between">
                <Text fontWeight="600" color="gray.600">Trial Date</Text>
                <Text>{new Date(confirmation.trialDate).toLocaleDateString()}</Text>
              </Flex>
            )}
            {confirmation.confirmationEmailSent && (
              <Text color="green.600" fontSize="xs" mt="2">Confirmation email sent.</Text>
            )}
          </Flex>
        </Box>
        <Button colorPalette="blue" onClick={() => router.push('/programs')}>
          Back to Programs
        </Button>
      </Box>
    );
  }

  // Form view
  return (
    <Box maxW="560px" mx="auto" py="8" px="4">
      <Button variant="ghost" size="sm" mb="4" onClick={() => router.push('/programs')}>
        <ArrowLeft size={16} /> Back to Programs
      </Button>

      {/* Program Summary */}
      <Box borderWidth="1px" borderRadius="lg" p="4" mb="6" bg="blue.50">
        <Heading size="md" mb="1">{program.name}</Heading>
        <Text fontSize="sm" color="gray.600">
          Ages {program.ageGroupMin}–{program.ageGroupMax} &bull; ${program.totalFee.toFixed(2)}
        </Text>
      </Box>

      <Heading size="lg" mb="6">Book a Trial</Heading>

      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <Box>
            <Text fontSize="sm" fontWeight="600" mb="1">Parent Name</Text>
            <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Full name" style={fieldStyle} />
            {fieldErrors.parentName && <Text fontSize="xs" color="red.500" mt="1">{fieldErrors.parentName}</Text>}
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="600" mb="1">Email</Text>
            <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="email@example.com" style={fieldStyle} />
            {fieldErrors.parentEmail && <Text fontSize="xs" color="red.500" mt="1">{fieldErrors.parentEmail}</Text>}
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="600" mb="1">Phone</Text>
            <input type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="(555) 123-4567" style={fieldStyle} />
            {fieldErrors.parentPhone && <Text fontSize="xs" color="red.500" mt="1">{fieldErrors.parentPhone}</Text>}
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="600" mb="1">Child Name</Text>
            <input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Child's full name" style={fieldStyle} />
            {fieldErrors.childName && <Text fontSize="xs" color="red.500" mt="1">{fieldErrors.childName}</Text>}
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="600" mb="1">Child Age</Text>
            <input type="number" value={childAge} onChange={(e) => setChildAge(e.target.value)} placeholder="Age" min={1} max={18} style={fieldStyle} />
            {fieldErrors.childAge && <Text fontSize="xs" color="red.500" mt="1">{fieldErrors.childAge}</Text>}
          </Box>

          {!trialDateId && (
            <Box>
              <Text fontSize="sm" color="gray.500">
                No trial date selected.{' '}
                <a href={`/programs/${programId}/trial-dates`} style={{ color: '#3182ce', textDecoration: 'underline' }}>
                  Select a date
                </a>
              </Text>
            </Box>
          )}

          <Button
            type="submit"
            colorPalette="blue"
            size="lg"
            w="100%"
            mt="2"
            disabled={submitting}
          >
            {submitting ? 'Booking...' : 'Book Trial'}
          </Button>
        </Flex>
      </form>
    </Box>
  );
}
