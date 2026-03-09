'use client';

import { Box, Flex, Heading, Text, Button, Input, Textarea, Spinner, Badge , Switch } from '@chakra-ui/react';
import { Plus, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/client/components/ui/ScreenStates';
import { toaster } from '@/client/lib/toaster';

// --------------- Types ---------------

interface CalendarDate {
  dateId: string;
  date: string;
  programId: string;
  programName: string;
  trialEligible: boolean;
  capacity: number;
  spotsRemaining: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Program {
  programId: string;
  name: string;
}

// --------------- Helpers ---------------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

export default function CalendarPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [programFilter, setProgramFilter] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [dates, setDates] = useState<CalendarDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form fields
  const [formDate, setFormDate] = useState('');
  const [formProgramId, setFormProgramId] = useState('');
  const [formCapacity, setFormCapacity] = useState('');
  const [formTrialEligible, setFormTrialEligible] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  // Fetch programs once
  useEffect(() => {
    void (async () => {
      try {
        const data = await api.get<{ programs: Program[] }>('/api/programs?status=active&limit=100');
        setPrograms(data.programs);
      } catch {
        // Non-blocking — program dropdown just stays empty
      }
    })();
  }, []);

  const fetchDates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let url = `/api/calendar?month=${month}&year=${year}`;
      if (programFilter) {url += `&programId=${programFilter}`;}
      const data = await api.get<{ dates: CalendarDate[] }>(url);
      setDates(data.dates);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load calendar dates';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [month, year, programFilter]);

  useEffect(() => { void fetchDates(); }, [fetchDates]);

  // Navigation
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else {setMonth(m => m - 1);}
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else {setMonth(m => m + 1);}
  };

  // Modal
  const openCreateModal = () => {
    setEditingId(null);
    setFormDate('');
    setFormProgramId(programs[0]?.programId ?? '');
    setFormCapacity('');
    setFormTrialEligible(false);
    setFormNotes('');
    setModalOpen(true);
  };

  const openEditModal = (d: CalendarDate) => {
    setEditingId(d.dateId);
    setFormDate(d.date);
    setFormProgramId(d.programId);
    setFormCapacity(String(d.capacity));
    setFormTrialEligible(d.trialEligible);
    setFormNotes(d.notes ?? '');
    setModalOpen(true);
  };

  const handleSave = () => { void doSave(); };
  const doSave = async () => {
    setSaving(true);
    const body = {
      date: formDate,
      programId: formProgramId,
      capacity: Number(formCapacity),
      trialEligible: formTrialEligible,
      notes: formNotes || null,
    };
    try {
      if (editingId) {
        await api.put(`/api/calendar/${editingId}`, body);
        toaster.success({ title: 'Saved', description: 'Calendar date updated.' });
      } else {
        await api.post('/api/calendar', body);
        toaster.success({ title: 'Created', description: 'Calendar date added.' });
      }
      setModalOpen(false);
      void fetchDates();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save calendar date';
      toaster.error({ title: 'Error', description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (dateId: string) => { void doDelete(dateId); };
  const doDelete = async (dateId: string) => {
    // eslint-disable-next-line no-alert
    if (!confirm('Delete this calendar date? This will fail if trials are booked.')) {return;}
    setDeleting(dateId);
    try {
      await api.delete(`/api/calendar/${dateId}`);
      toaster.success({ title: 'Deleted', description: 'Calendar date removed.' });
      void fetchDates();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete calendar date';
      toaster.error({ title: 'Error', description: msg });
    } finally {
      setDeleting(null);
    }
  };

  // --------------- Render ---------------

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="6" flexWrap="wrap" gap="3">
        <Heading size="lg">Calendar</Heading>
        <Button colorPalette="blue" size="sm" onClick={openCreateModal}>
          <Plus size={16} /> Add Date
        </Button>
      </Flex>

      {/* Filters */}
      <Flex gap="4" mb="5" align="center" flexWrap="wrap">
        {/* Program filter */}
        <Box>
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              minWidth: '200px',
            }}
          >
            <option value="">All Programs</option>
            {programs.map((p) => (
              <option key={p.programId} value={p.programId}>{p.name}</option>
            ))}
          </select>
        </Box>

        {/* Month/Year navigation */}
        <Flex align="center" gap="2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft size={16} />
          </Button>
          <Text fontWeight="600" minW="160px" textAlign="center">
            {MONTHS[month - 1]} {year}
          </Text>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight size={16} />
          </Button>
        </Flex>
      </Flex>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading calendar dates..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void fetchDates()} />
      ) : dates.length === 0 ? (
        <EmptyState
          title="No dates"
          message="No calendar dates found for this month. Add one to get started."
          action={
            <Button colorPalette="blue" size="sm" onClick={openCreateModal}>
              <Plus size={16} /> Add Date
            </Button>
          }
        />
      ) : (
        <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
          <Box as="table" w="100%" fontSize="sm">
            <Box as="thead" bg="gray.50">
              <Box as="tr">
                <Box as="th" textAlign="left" p="3" fontWeight="600">Date</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Program</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Trial Eligible</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Capacity</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Spots Left</Box>
                <Box as="th" textAlign="right" p="3" fontWeight="600">Actions</Box>
              </Box>
            </Box>
            <Box as="tbody">
              {dates.map((d) => (
                <Box
                  as="tr"
                  key={d.dateId}
                  _hover={{ bg: 'gray.50' }}
                  cursor="pointer"
                  onClick={() => openEditModal(d)}
                >
                  <Box as="td" p="3" fontWeight="500">{formatDateDisplay(d.date)}</Box>
                  <Box as="td" p="3">{d.programName}</Box>
                  <Box as="td" p="3">
                    {d.trialEligible ? (
                      <Badge colorPalette="green">Trial</Badge>
                    ) : (
                      <Text color="gray.400">No</Text>
                    )}
                  </Box>
                  <Box as="td" p="3">{d.capacity}</Box>
                  <Box as="td" p="3">
                    <Text color={d.spotsRemaining === 0 ? 'red.500' : 'green.600'} fontWeight="500">
                      {d.spotsRemaining}
                    </Text>
                  </Box>
                  <Box as="td" p="3" textAlign="right">
                    <Button
                      variant="ghost"
                      size="sm"
                      colorPalette="red"
                      onClick={(e) => { e.stopPropagation(); handleDelete(d.dateId); }}
                      disabled={deleting === d.dateId}
                    >
                      {deleting === d.dateId ? <Spinner size="sm" /> : <Trash2 size={16} />}
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Modal */}
      {modalOpen && (
        <Box
          position="fixed"
          inset="0"
          bg="blackAlpha.600"
          zIndex="1400"
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={() => setModalOpen(false)}
        >
          <Box
            bg="white"
            borderRadius="lg"
            p="6"
            maxW="lg"
            w="90%"
            maxH="80vh"
            overflow="auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Flex justify="space-between" align="center" mb="4">
              <Heading size="md">{editingId ? 'Edit Date' : 'Add Date'}</Heading>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </Button>
            </Flex>

            <Flex direction="column" gap="4">
              <Box>
                <Text fontWeight="500" mb="1" fontSize="sm">Date</Text>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </Box>

              <Box>
                <Text fontWeight="500" mb="1" fontSize="sm">Program</Text>
                <select
                  value={formProgramId}
                  onChange={(e) => setFormProgramId(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px',
                    width: '100%',
                  }}
                >
                  <option value="">Select a program</option>
                  {programs.map((p) => (
                    <option key={p.programId} value={p.programId}>{p.name}</option>
                  ))}
                </select>
              </Box>

              <Box>
                <Text fontWeight="500" mb="1" fontSize="sm">Capacity</Text>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 20"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                />
              </Box>

              <Flex align="center" gap="3">
                <Switch.Root
                  checked={formTrialEligible}
                  onCheckedChange={(e) => setFormTrialEligible(e.checked)}
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Label fontWeight="500" fontSize="sm">Trial Eligible</Switch.Label>
                </Switch.Root>
              </Flex>

              <Box>
                <Text fontWeight="500" mb="1" fontSize="sm">Notes</Text>
                <Textarea
                  placeholder="Optional notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                />
              </Box>

              <Flex justify="flex-end" gap="3" mt="2">
                <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  colorPalette="blue"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !formDate || !formProgramId || !formCapacity}
                >
                  {saving ? <Spinner size="sm" /> : editingId ? 'Save Changes' : 'Add Date'}
                </Button>
              </Flex>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  );
}
