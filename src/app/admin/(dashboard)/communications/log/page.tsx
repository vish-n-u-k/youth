'use client';

import { Box, Flex, Heading, Text, Button, Input, Spinner, Badge } from '@chakra-ui/react';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/client/components/ui/ScreenStates';
import { toaster } from '@/client/lib/toaster';

// --------------- Types ---------------

interface LogEntry {
  logId: string;
  recipientEmail: string;
  subject: string;
  triggerEvent: string;
  deliveryStatus: 'PENDING' | 'SENT' | 'FAILED';
  sentAt: string | null;
  errorMessage: string | null;
}

interface LogResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_OPTIONS = ['', 'PENDING', 'SENT', 'FAILED'] as const;
const STATUS_LABELS: Record<string, string> = { '': 'All Statuses', PENDING: 'Pending', SENT: 'Sent', FAILED: 'Failed' };
const STATUS_COLORS: Record<string, string> = { SENT: 'green', PENDING: 'yellow', FAILED: 'red' };

// --------------- Component ---------------

export default function CommunicationsLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter) {params.set('deliveryStatus', statusFilter);}
      if (triggerFilter) {params.set('triggerEvent', triggerFilter);}
      if (search) {params.set('search', search);}
      params.set('page', String(page));
      params.set('limit', String(limit));

      const data = await api.get<LogResponse>(`/api/communications/log?${params.toString()}`);
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load communications log';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, triggerFilter, search, page]);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  // Reset to page 1 when filters change
  const handleStatusChange = (val: string) => { setStatusFilter(val); setPage(1); };
  const handleTriggerChange = (val: string) => { setTriggerFilter(val); setPage(1); };
  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };

  const handleRetry = (logId: string) => { void doRetry(logId); };
  const doRetry = async (logId: string) => {
    setRetryingId(logId);
    try {
      await api.post<{ logId: string; deliveryStatus: string }>(`/api/communications/log/${logId}/retry`);
      toaster.success({ title: 'Retried', description: 'Message retry initiated.' });
      void fetchLogs();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Retry failed';
      toaster.error({ title: 'Error', description: msg });
    } finally {
      setRetryingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // --------------- Render ---------------

  return (
    <Box>
      <Flex justify="space-between" align="center" mb="6">
        <Heading size="lg">Communications Log</Heading>
      </Flex>

      {/* Filters */}
      <Flex gap="3" mb="4" wrap="wrap" align="center">
        <select
          style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', minWidth: '150px' }}
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <Input
          placeholder="Trigger event"
          size="sm"
          maxW="200px"
          value={triggerFilter}
          onChange={(e) => handleTriggerChange(e.target.value)}
        />

        <Input
          placeholder="Search recipient or subject..."
          size="sm"
          maxW="280px"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </Flex>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading logs..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void fetchLogs()} />
      ) : logs.length === 0 ? (
        <EmptyState title="No logs found" message="No communication logs match the current filters." />
      ) : (
        <>
          <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
            <Box as="table" w="100%" fontSize="sm">
              <Box as="thead" bg="gray.50">
                <Box as="tr">
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Recipient</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Subject</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Trigger</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Status</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Sent</Box>
                  <Box as="th" textAlign="left" p="3" fontWeight="600">Actions</Box>
                </Box>
              </Box>
              <Box as="tbody">
                {logs.map((log) => (
                  <Box as="tr" key={log.logId} _hover={{ bg: 'gray.50' }}>
                    <Box as="td" p="3" fontWeight="500">{log.recipientEmail}</Box>
                    <Box as="td" p="3">{log.subject}</Box>
                    <Box as="td" p="3">{log.triggerEvent}</Box>
                    <Box as="td" p="3">
                      <Badge colorPalette={STATUS_COLORS[log.deliveryStatus] ?? 'gray'}>
                        {log.deliveryStatus}
                      </Badge>
                      {log.errorMessage && (
                        <Text fontSize="xs" color="red.500" mt="1">{log.errorMessage}</Text>
                      )}
                    </Box>
                    <Box as="td" p="3" color="gray.500">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}
                    </Box>
                    <Box as="td" p="3">
                      {log.deliveryStatus === 'FAILED' && (
                        <Button
                          size="xs"
                          colorPalette="red"
                          variant="outline"
                          onClick={() => handleRetry(log.logId)}
                          disabled={retryingId === log.logId}
                        >
                          {retryingId === log.logId ? <Spinner size="xs" /> : <RefreshCw size={14} />}
                          <Text ml="1">Retry</Text>
                        </Button>
                      )}
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
                size="xs"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={14} /> Prev
              </Button>
              <Text fontSize="sm" lineHeight="tall" px="2">
                {page} / {totalPages}
              </Text>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next <ChevronRight size={14} />
              </Button>
            </Flex>
          </Flex>
        </>
      )}
    </Box>
  );
}
