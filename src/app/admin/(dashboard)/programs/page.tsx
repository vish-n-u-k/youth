'use client';

import { Box, Flex, Heading, Text, Button, Badge } from '@chakra-ui/react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/client/components/ui/ScreenStates';

// --------------- Types ---------------

interface ProgramSummary {
  programId: string;
  name: string;
  ageGroupMin: number;
  ageGroupMax: number;
  startDate: string;
  endDate: string;
  enrollmentCount: number;
  capacity: number;
  status: string;
  totalFee: number;
}

interface ProgramListResponse {
  programs: ProgramSummary[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  draft: 'yellow',
  archived: 'gray',
};

// --------------- Component ---------------

export default function ProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) {params.set('status', status);}
      const data = await api.get<ProgramListResponse>(`/api/programs?${params.toString()}`);
      setPrograms(data.programs);
      setTotal(data.total);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load programs';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { void fetchPrograms(); }, [fetchPrograms]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
    setPage(1);
  };

  // --------------- Render ---------------

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="6" gap="4" flexWrap="wrap">
        <Heading size="lg">Programs</Heading>
        <Flex gap="3" align="center">
          <select
            value={status}
            onChange={handleStatusChange}
            style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', fontSize: '14px', background: 'white' }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <Button colorPalette="blue" size="sm" onClick={() => router.push('/admin/programs/new')}>
            <Plus size={16} /> Create Program
          </Button>
        </Flex>
      </Flex>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading programs..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void fetchPrograms()} />
      ) : programs.length === 0 ? (
        <EmptyState
          title="No programs"
          message="Create your first program to get started."
          action={
            <Button colorPalette="blue" size="sm" onClick={() => router.push('/admin/programs/new')}>
              <Plus size={16} /> Create Program
            </Button>
          }
        />
      ) : (
        <>
          <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
            <Box as="table" w="100%" fontSize="sm">
              <Box as="thead" bg="gray.50">
                <Box as="tr">
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Name</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Age Group</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Dates</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Enrollment</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Fee</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Status</Box>
                </Box>
              </Box>
              <Box as="tbody">
                {programs.map((p) => (
                  <Box
                    as="tr"
                    key={p.programId}
                    _hover={{ bg: 'gray.50' }}
                    cursor="pointer"
                    onClick={() => router.push(`/admin/programs/${p.programId}`)}
                  >
                    <Box as="td" p="3" fontWeight="500">{p.name}</Box>
                    <Box as="td" p="3">{p.ageGroupMin}–{p.ageGroupMax} yrs</Box>
                    <Box as="td" p="3" color="gray.600">
                      {new Date(p.startDate).toLocaleDateString()} – {new Date(p.endDate).toLocaleDateString()}
                    </Box>
                    <Box as="td" p="3">
                      {p.enrollmentCount}/{p.capacity}
                    </Box>
                    <Box as="td" p="3">${p.totalFee.toFixed(2)}</Box>
                    <Box as="td" p="3">
                      <Badge colorPalette={STATUS_COLORS[p.status] ?? 'gray'}>
                        {p.status}
                      </Badge>
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
