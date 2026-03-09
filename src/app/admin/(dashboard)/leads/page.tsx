'use client';

import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  Button,
  Table,
} from '@chakra-ui/react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/client/components/ui/ScreenStates';
import { toaster } from '@/client/lib/toaster';

/* ---------- Types ---------- */

interface Lead {
  leadId: string;
  parentName: string;
  email: string;
  phone: string | null;
  childName: string | null;
  childAge: number | null;
  source: string;
  status: string;
  interestedProgramId: string | null;
  interestedProgramName: string | null;
  locationId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
}

/* ---------- Constants ---------- */

const STATUSES = ['all', 'new', 'contacted', 'trial_scheduled', 'enrolled', 'lost'] as const;
const SOURCES = ['all', 'website', 'referral', 'walk_in', 'manual'] as const;
const LIMIT = 20;

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  trial_scheduled: 'Trial Scheduled',
  enrolled: 'Enrolled',
  lost: 'Lost',
};

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  referral: 'Referral',
  walk_in: 'Walk-in',
  manual: 'Manual',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ---------- Component ---------- */

export default function LeadsPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {params.set('status', statusFilter);}
      if (sourceFilter !== 'all') {params.set('source', sourceFilter);}
      if (search) {params.set('search', search);}
      params.set('page', String(page));
      params.set('limit', String(LIMIT));

      const data = await api.get<LeadsResponse>(`/api/leads?${params.toString()}`);
      setLeads(data.leads);
      setTotal(data.total);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load leads';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, search, page]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleStatusChange = (leadId: string, newStatus: string) => { void doStatusChange(leadId, newStatus); };
  const doStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await api.patch(`/api/leads/${leadId}/status`, { status: newStatus });
      setLeads((prev) =>
        prev.map((l) => (l.leadId === leadId ? { ...l, status: newStatus } : l))
      );
      toaster.success({ title: 'Status updated', description: `Lead status changed to ${STATUS_LABELS[newStatus] ?? newStatus}.` });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update status';
      toaster.error({ title: 'Error', description: message });
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  const selectStyle: React.CSSProperties = {
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer',
  };

  if (error && leads.length === 0) {
    return (
      <Box>
        <Heading size="lg" mb="6">Leads</Heading>
        <ErrorState message={error} onRetry={() => void fetchLeads()} />
      </Box>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb="6">Leads</Heading>

      {/* Filters */}
      <Flex gap="3" mb="5" wrap="wrap" align="center">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={selectStyle}
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All Statuses' : STATUS_LABELS[s] ?? s}
            </option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          style={selectStyle}
          aria-label="Filter by source"
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All Sources' : SOURCE_LABELS[s] ?? s}
            </option>
          ))}
        </select>

        <Flex gap="2" align="center">
          <Input
            placeholder="Search leads..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            size="sm"
            width="220px"
          />
          <Button size="sm" variant="outline" onClick={handleSearch}>
            <Search size={16} />
          </Button>
        </Flex>
      </Flex>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading leads..." />
      ) : leads.length === 0 ? (
        <EmptyState title="No leads found" message="Try adjusting your filters or add a new lead." />
      ) : (
        <>
          <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Parent Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Email</Table.ColumnHeader>
                  <Table.ColumnHeader>Child Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Program</Table.ColumnHeader>
                  <Table.ColumnHeader>Source</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Created</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {leads.map((lead) => (
                  <Table.Row
                    key={lead.leadId}
                    cursor="pointer"
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => router.push(`/admin/leads/${lead.leadId}`)}
                  >
                    <Table.Cell fontWeight="500">{lead.parentName}</Table.Cell>
                    <Table.Cell>{lead.email}</Table.Cell>
                    <Table.Cell>{lead.childName ?? '-'}</Table.Cell>
                    <Table.Cell>{lead.interestedProgramName ?? '-'}</Table.Cell>
                    <Table.Cell>{SOURCE_LABELS[lead.source] ?? lead.source}</Table.Cell>
                    <Table.Cell onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.leadId, e.target.value)}
                        style={{
                          ...selectStyle,
                          fontWeight: 500,
                          fontSize: '13px',
                          padding: '3px 6px',
                        }}
                      >
                        {STATUSES.filter((s) => s !== 'all').map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s] ?? s}
                          </option>
                        ))}
                      </select>
                    </Table.Cell>
                    <Table.Cell whiteSpace="nowrap">{formatDate(lead.createdAt)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>

          {/* Pagination */}
          <Flex justify="space-between" align="center" mt="4">
            <Text fontSize="sm" color="gray.500">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </Text>
            <Flex gap="2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </Flex>
          </Flex>
        </>
      )}
    </Box>
  );
}
