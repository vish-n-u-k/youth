'use client';

import { Box, Flex, Heading, Text, Button, Badge } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/client/components/ui/ScreenStates';

// --------------- Types ---------------

interface EnrollmentSummary {
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

interface EnrollmentListResponse {
  enrollments: EnrollmentSummary[];
  total: number;
  page: number;
  limit: number;
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

const selectStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '14px', background: 'white',
};

const inputStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px 6px 32px', fontSize: '14px', background: 'white', width: '250px',
};

// --------------- Component ---------------

export default function EnrollmentsPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) {params.set('status', status);}
      if (paymentStatus) {params.set('paymentStatus', paymentStatus);}
      if (search.trim()) {params.set('search', search.trim());}
      const data = await api.get<EnrollmentListResponse>(`/api/enrollments?${params.toString()}`);
      setEnrollments(data.enrollments);
      setTotal(data.total);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load enrollments';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, status, paymentStatus, search]);

  useEffect(() => { void fetchEnrollments(); }, [fetchEnrollments]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // --------------- Render ---------------

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="6" gap="4" flexWrap="wrap">
        <Heading size="lg">Enrollments</Heading>
      </Flex>

      {/* Filters */}
      <Flex gap="3" mb="5" flexWrap="wrap" align="center">
        <Box position="relative">
          <input
            type="text"
            placeholder="Search parent or child..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); } }}
            style={inputStyle}
          />
          <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="gray.400">
            <Search size={14} />
          </Box>
        </Box>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={selectStyle}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={paymentStatus}
          onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
          style={selectStyle}
        >
          <option value="">All Payments</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </Flex>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading enrollments..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void fetchEnrollments()} />
      ) : enrollments.length === 0 ? (
        <EmptyState
          title="No enrollments"
          message="No enrollments match the current filters."
        />
      ) : (
        <>
          <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
            <Box as="table" w="100%" fontSize="sm">
              <Box as="thead" bg="gray.50">
                <Box as="tr">
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Parent</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Child</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Program</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Status</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Payment</Box>
                  <Box as="th" textAlign="right" p="3" fontWeight="600">Amount Due</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Enrolled</Box>
                </Box>
              </Box>
              <Box as="tbody">
                {enrollments.map((e) => (
                  <Box
                    as="tr"
                    key={e.enrollmentId}
                    _hover={{ bg: 'gray.50' }}
                    cursor="pointer"
                    onClick={() => router.push(`/admin/enrollments/${e.enrollmentId}`)}
                  >
                    <Box as="td" p="3" fontWeight="500">{e.parentName}</Box>
                    <Box as="td" p="3">{e.childName}</Box>
                    <Box as="td" p="3" color="gray.600">{e.programName}</Box>
                    <Box as="td" p="3">
                      <Badge colorPalette={STATUS_COLORS[e.status] ?? 'gray'}>
                        {e.status}
                      </Badge>
                    </Box>
                    <Box as="td" p="3">
                      <Badge colorPalette={PAYMENT_COLORS[e.paymentStatus] ?? 'gray'}>
                        {e.paymentStatus}
                      </Badge>
                    </Box>
                    <Box as="td" p="3" textAlign="right">${e.totalDue.toFixed(2)}</Box>
                    <Box as="td" p="3" color="gray.600">
                      {new Date(e.enrolledAt).toLocaleDateString()}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Pagination */}
          <Flex justify="space-between" align="center" mt="4">
            <Text fontSize="sm" color="gray.500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </Text>
            <Flex gap="2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} /> Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next <ChevronRight size={16} />
              </Button>
            </Flex>
          </Flex>
        </>
      )}
    </Box>
  );
}
