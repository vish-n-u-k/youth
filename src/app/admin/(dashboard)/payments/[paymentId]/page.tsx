'use client';

import { Box, Flex, Heading, Text, Button, Badge, Input, Textarea } from '@chakra-ui/react';
import { ArrowLeft, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState } from '@/client/components/ui/ScreenStates';
import { toaster } from '@/client/lib/toaster';

// --------------- Types ---------------

interface Payment {
  paymentId: string;
  enrollmentId: string;
  parentName: string;
  parentEmail: string;
  childName: string;
  programName: string;
  status: string;
  amountDue: number;
  amountReceived: number;
  remainingBalance: number;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  partial: 'orange',
  paid: 'green',
  overdue: 'red',
  refunded: 'gray',
};

const STATUSES = ['pending', 'partial', 'paid', 'overdue', 'refunded'];

// --------------- Component ---------------

export default function PaymentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const paymentId = params.paymentId as string;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formStatus, setFormStatus] = useState('');
  const [formAmountReceived, setFormAmountReceived] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchPayment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Payment>(`/api/payments/${paymentId}`);
      setPayment(data);
      setFormStatus(data.status);
      setFormAmountReceived(String(data.amountReceived));
      setFormPaymentMethod(data.paymentMethod ?? '');
      setFormNotes(data.notes ?? '');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load payment';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => { void fetchPayment(); }, [fetchPayment]);

  const handleSave = () => { void doSave(); };
  const doSave = async () => {
    try {
      setSaving(true);
      const updated = await api.put<Payment>(`/api/payments/${paymentId}`, {
        status: formStatus,
        amountReceived: parseFloat(formAmountReceived) || 0,
        paymentMethod: formPaymentMethod || null,
        notes: formNotes || null,
      });
      setPayment(updated);
      toaster.success({ title: 'Payment updated', description: 'Payment details saved successfully.' });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update payment';
      toaster.error({ title: 'Update failed', description: msg });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  // --------------- Render ---------------

  if (loading) {return <LoadingState message="Loading payment..." />;}
  if (error) {return <ErrorState message={error} onRetry={() => void fetchPayment()} />;}
  if (!payment) {return <ErrorState message="Payment not found" />;}

  return (
    <Box>
      {/* Back button & header */}
      <Flex align="center" gap="3" mb="6">
        <Button size="sm" variant="ghost" onClick={() => router.push('/admin/payments')}>
          <ArrowLeft size={16} /> Back
        </Button>
        <Heading size="lg">Payment Detail</Heading>
        <Badge colorPalette={STATUS_COLORS[payment.status] ?? 'gray'} ml="2">
          {payment.status}
        </Badge>
      </Flex>

      {/* Amount summary */}
      <Flex gap="4" mb="6" flexWrap="wrap">
        <Box borderWidth="1px" borderRadius="lg" p="4" flex="1" minW="160px">
          <Text fontSize="xs" color="gray.500" fontWeight="600" mb="1">Amount Due</Text>
          <Text fontSize="2xl" fontWeight="700">${payment.amountDue.toFixed(2)}</Text>
        </Box>
        <Box borderWidth="1px" borderRadius="lg" p="4" flex="1" minW="160px">
          <Text fontSize="xs" color="gray.500" fontWeight="600" mb="1">Received</Text>
          <Text fontSize="2xl" fontWeight="700" color="green.600">
            ${payment.amountReceived.toFixed(2)}
          </Text>
        </Box>
        <Box borderWidth="1px" borderRadius="lg" p="4" flex="1" minW="160px">
          <Text fontSize="xs" color="gray.500" fontWeight="600" mb="1">Remaining Balance</Text>
          <Text fontSize="2xl" fontWeight="700" color={payment.remainingBalance > 0 ? 'red.600' : 'green.600'}>
            ${payment.remainingBalance.toFixed(2)}
          </Text>
        </Box>
      </Flex>

      <Flex gap="6" flexWrap="wrap">
        {/* Payment info panel */}
        <Box borderWidth="1px" borderRadius="lg" p="5" flex="1" minW="280px">
          <Heading size="md" mb="4">Payment Info</Heading>
          <Flex direction="column" gap="3">
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Parent Name</Text>
              <Text>{payment.parentName}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Parent Email</Text>
              <Text>{payment.parentEmail}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Child Name</Text>
              <Text>{payment.childName}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Program</Text>
              <Text>{payment.programName}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Enrollment ID</Text>
              <Text fontSize="sm" color="gray.600">{payment.enrollmentId}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Created</Text>
              <Text>{formatDate(payment.createdAt)}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" fontWeight="600">Last Updated</Text>
              <Text>{formatDate(payment.updatedAt)}</Text>
            </Box>
          </Flex>
        </Box>

        {/* Edit form */}
        <Box borderWidth="1px" borderRadius="lg" p="5" flex="1" minW="280px">
          <Heading size="md" mb="4">Update Payment</Heading>
          <Flex direction="column" gap="4">
            <Box>
              <Text fontSize="sm" fontWeight="600" mb="1">Status</Text>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                  width: '100%',
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="600" mb="1">Amount Received ($)</Text>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formAmountReceived}
                onChange={(e) => setFormAmountReceived(e.target.value)}
                size="sm"
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="600" mb="1">Payment Method</Text>
              <Input
                placeholder="e.g. Zelle, Cash, Check"
                value={formPaymentMethod}
                onChange={(e) => setFormPaymentMethod(e.target.value)}
                size="sm"
              />
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="600" mb="1">Notes</Text>
              <Textarea
                placeholder="Optional notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                size="sm"
                rows={3}
              />
            </Box>
            <Button
              colorPalette="blue"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              alignSelf="flex-start"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}
