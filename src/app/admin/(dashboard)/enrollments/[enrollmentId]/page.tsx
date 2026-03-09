'use client';

import { Box, Flex, Heading, Text, Button, Badge } from '@chakra-ui/react';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState } from '@/client/components/ui/ScreenStates';
import { toaster } from '@/client/lib/toaster';

// --------------- Types ---------------

interface Enrollment {
  enrollmentId: string;
  parentName: string;
  parentEmail: string;
  childName: string;
  childAge: number;
  programId: string;
  programName: string;
  status: string;
  paymentStatus: string;
  totalDue: number;
  amountReceived: number;
  enrolledAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  trial: 'blue',
  completed: 'gray',
  cancelled: 'red',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: 'yellow',
  partial: 'orange',
  paid: 'green',
  overdue: 'red',
};

const STATUSES = ['active', 'trial', 'completed', 'cancelled'];

// --------------- Component ---------------

export default function EnrollmentDetailPage() {
  const router = useRouter();
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchEnrollment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Enrollment>(`/api/enrollments/${enrollmentId}`);
      setEnrollment(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load enrollment';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => { void fetchEnrollment(); }, [fetchEnrollment]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => { void doStatusChange(e); };
  const doStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (!newStatus || newStatus === enrollment?.status) {return;}
    try {
      setUpdating(true);
      const updated = await api.patch<Enrollment>(`/api/enrollments/${enrollmentId}/status`, { status: newStatus });
      setEnrollment(updated);
      toaster.success({ title: 'Status updated', description: `Enrollment status changed to ${newStatus}.` });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update status';
      toaster.error({ title: 'Update failed', description: msg });
    } finally {
      setUpdating(false);
    }
  };

  // --------------- Render ---------------

  if (loading) {return <LoadingState message="Loading enrollment..." />;}
  if (error) {return <ErrorState message={error} onRetry={() => void fetchEnrollment()} />;}
  if (!enrollment) {return <ErrorState message="Enrollment not found" />;}

  const balance = enrollment.totalDue - enrollment.amountReceived;

  return (
    <Box>
      {/* Back button */}
      <Button variant="ghost" size="sm" mb="4" onClick={() => router.push('/admin/enrollments')}>
        <ArrowLeft size={16} /> Back to Enrollments
      </Button>

      <Heading size="lg" mb="6">Enrollment Detail</Heading>

      <Flex gap="6" flexWrap="wrap">
        {/* Info Panel */}
        <Box flex="1" minW="320px" borderWidth="1px" borderRadius="lg" p="5">
          <Heading size="md" mb="4">Information</Heading>
          <Flex direction="column" gap="3" fontSize="sm">
            <Flex justify="space-between">
              <Text fontWeight="600" color="gray.600">Parent Name</Text>
              <Text>{enrollment.parentName}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontWeight="600" color="gray.600">Parent Email</Text>
              <Text>{enrollment.parentEmail}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontWeight="600" color="gray.600">Child Name</Text>
              <Text>{enrollment.childName}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontWeight="600" color="gray.600">Child Age</Text>
              <Text>{enrollment.childAge} years</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontWeight="600" color="gray.600">Program</Text>
              <Text>{enrollment.programName}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text fontWeight="600" color="gray.600">Enrolled</Text>
              <Text>{new Date(enrollment.enrolledAt).toLocaleDateString()}</Text>
            </Flex>
          </Flex>
        </Box>

        {/* Status & Payment Panel */}
        <Box flex="1" minW="320px">
          {/* Status */}
          <Box borderWidth="1px" borderRadius="lg" p="5" mb="4">
            <Heading size="md" mb="4">Status</Heading>
            <Flex align="center" gap="3">
              <Badge colorPalette={STATUS_COLORS[enrollment.status] ?? 'gray'} fontSize="sm" px="2" py="1">
                {enrollment.status}
              </Badge>
              <select
                value={enrollment.status}
                onChange={handleStatusChange}
                disabled={updating}
                style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '14px', background: 'white' }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              {updating && <Text fontSize="xs" color="gray.500">Updating...</Text>}
            </Flex>
          </Box>

          {/* Payment Summary */}
          <Box borderWidth="1px" borderRadius="lg" p="5">
            <Heading size="md" mb="4">Payment Summary</Heading>
            <Flex direction="column" gap="3" fontSize="sm">
              <Flex justify="space-between">
                <Text fontWeight="600" color="gray.600">Total Due</Text>
                <Text fontWeight="600">${enrollment.totalDue.toFixed(2)}</Text>
              </Flex>
              <Flex justify="space-between">
                <Text fontWeight="600" color="gray.600">Amount Received</Text>
                <Text color="green.600">${enrollment.amountReceived.toFixed(2)}</Text>
              </Flex>
              <Box borderTopWidth="1px" pt="2">
                <Flex justify="space-between">
                  <Text fontWeight="600" color="gray.600">Balance</Text>
                  <Text fontWeight="700" color={balance > 0 ? 'red.600' : 'green.600'}>
                    ${balance.toFixed(2)}
                  </Text>
                </Flex>
              </Box>
              <Flex justify="space-between" mt="1">
                <Text fontWeight="600" color="gray.600">Payment Status</Text>
                <Badge colorPalette={PAYMENT_COLORS[enrollment.paymentStatus] ?? 'gray'}>
                  {enrollment.paymentStatus}
                </Badge>
              </Flex>
            </Flex>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
