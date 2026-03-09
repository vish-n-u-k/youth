'use client';

import { Box, Flex, Heading, Text, Button, Badge, Input } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/client/components/ui/ScreenStates';

// --------------- Types ---------------

interface PaymentSummary {
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

interface PaymentListResponse {
  payments: PaymentSummary[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  partial: 'orange',
  paid: 'green',
  overdue: 'red',
  refunded: 'gray',
};

// --------------- Component ---------------

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) {params.set('status', status);}
      if (search) {params.set('search', search);}
      const data = await api.get<PaymentListResponse>(`/api/payments?${params.toString()}`);
      setPayments(data.payments);
      setTotal(data.total);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load payments';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { void fetchPayments(); }, [fetchPayments]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {handleSearch();}
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  // --------------- Render ---------------

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="6" gap="4" flexWrap="wrap">
        <Heading size="lg">Payments</Heading>
        <Flex gap="3" align="center" flexWrap="wrap">
          <Flex gap="2" align="center">
            <Input
              placeholder="Search parent, child, program..."
              size="sm"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              maxW="280px"
            />
            <Button size="sm" variant="outline" onClick={handleSearch}>
              <Search size={16} />
            </Button>
          </Flex>
          <select
            value={status}
            onChange={handleStatusChange}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.875rem',
              backgroundColor: 'white',
            }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="refunded">Refunded</option>
          </select>
        </Flex>
      </Flex>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading payments..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void fetchPayments()} />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments found"
          message="No payments match your current filters."
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
                  <Box as="th" textAlign="right" p="3" fontWeight="600">Due</Box>
                  <Box as="th" textAlign="right" p="3" fontWeight="600">Received</Box>
                  <Box as="th" textAlign="right" p="3" fontWeight="600">Balance</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Status</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Date</Box>
                </Box>
              </Box>
              <Box as="tbody">
                {payments.map((p) => (
                  <Box
                    as="tr"
                    key={p.paymentId}
                    _hover={{ bg: 'gray.50' }}
                    cursor="pointer"
                    onClick={() => router.push(`/admin/payments/${p.paymentId}`)}
                  >
                    <Box as="td" p="3" fontWeight="500">{p.parentName}</Box>
                    <Box as="td" p="3">{p.childName}</Box>
                    <Box as="td" p="3">{p.programName}</Box>
                    <Box as="td" p="3" textAlign="right">${p.amountDue.toFixed(2)}</Box>
                    <Box as="td" p="3" textAlign="right">${p.amountReceived.toFixed(2)}</Box>
                    <Box as="td" p="3" textAlign="right" fontWeight="500">
                      ${p.remainingBalance.toFixed(2)}
                    </Box>
                    <Box as="td" p="3">
                      <Badge colorPalette={STATUS_COLORS[p.status] ?? 'gray'}>
                        {p.status}
                      </Badge>
                    </Box>
                    <Box as="td" p="3" color="gray.600">{formatDate(p.createdAt)}</Box>
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
