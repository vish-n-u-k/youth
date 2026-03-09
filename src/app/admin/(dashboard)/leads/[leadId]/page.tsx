'use client';

import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  Textarea,
  Button,
  Badge,
} from '@chakra-ui/react';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Send,
  Plus,
  MessageSquare,
  Activity,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState } from '@/client/components/ui/ScreenStates';
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

interface Note {
  noteId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface ActivityItem {
  activityId: string;
  type: string;
  description: string;
  createdAt: string;
}

/* ---------- Constants ---------- */

const STATUSES = ['new', 'contacted', 'trial_scheduled', 'enrolled', 'lost'] as const;
const SOURCES = ['website', 'referral', 'walk_in', 'manual'] as const;

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  trial_scheduled: 'Trial Scheduled',
  enrolled: 'Enrolled',
  lost: 'Lost',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'blue',
  contacted: 'yellow',
  trial_scheduled: 'orange',
  enrolled: 'green',
  lost: 'gray',
};

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  referral: 'Referral',
  walk_in: 'Walk-in',
  manual: 'Manual',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const selectStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  background: 'white',
  cursor: 'pointer',
  width: '100%',
};

/* ---------- Component ---------- */

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId as string;

  // Lead state
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Activity state
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Trial link state
  const [sendingTrial, setSendingTrial] = useState(false);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Lead>(`/api/leads/${leadId}`);
      setLead(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load lead';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const fetchNotes = useCallback(async () => {
    try {
      const data = await api.get<{ notes: Note[] }>(`/api/leads/${leadId}/notes`);
      setNotes(data.notes);
    } catch {
      // Silently fail for notes
    }
  }, [leadId]);

  const fetchActivities = useCallback(async () => {
    try {
      const data = await api.get<{ activities: ActivityItem[] }>(`/api/leads/${leadId}/activity`);
      setActivities(data.activities);
    } catch {
      // Silently fail for activities
    }
  }, [leadId]);

  useEffect(() => {
    void fetchLead();
    void fetchNotes();
    void fetchActivities();
  }, [fetchLead, fetchNotes, fetchActivities]);

  /* ---------- Handlers ---------- */

  const startEditing = () => {
    if (!lead) {return;}
    setEditForm({
      parentName: lead.parentName,
      email: lead.email,
      phone: lead.phone,
      childName: lead.childName,
      childAge: lead.childAge,
      interestedProgramId: lead.interestedProgramId,
      source: lead.source,
      status: lead.status,
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditForm({});
  };

  const handleSave = () => { void doSave(); };
  const doSave = async () => {
    setSaving(true);
    try {
      const updated = await api.put<Lead>(`/api/leads/${leadId}`, editForm);
      setLead(updated);
      setEditing(false);
      toaster.success({ title: 'Saved', description: 'Lead updated successfully.' });
      void fetchActivities();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update lead';
      toaster.error({ title: 'Error', description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = () => { void doAddNote(); };
  const doAddNote = async () => {
    if (!newNote.trim()) {return;}
    setAddingNote(true);
    try {
      await api.post(`/api/leads/${leadId}/notes`, { content: newNote.trim() });
      setNewNote('');
      toaster.success({ title: 'Note added', description: 'Note has been saved.' });
      void fetchNotes();
      void fetchActivities();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to add note';
      toaster.error({ title: 'Error', description: message });
    } finally {
      setAddingNote(false);
    }
  };

  const handleSendTrialLink = () => { void doSendTrialLink(); };
  const doSendTrialLink = async () => {
    // eslint-disable-next-line no-alert
    if (!confirm('Send a trial booking link email to this lead?')) {return;}
    setSendingTrial(true);
    try {
      const data = await api.post<{ message: string }>(`/api/leads/${leadId}/send-trial-link`);
      toaster.success({ title: 'Sent', description: data.message ?? 'Trial link sent successfully.' });
      void fetchActivities();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to send trial link';
      toaster.error({ title: 'Error', description: message });
    } finally {
      setSendingTrial(false);
    }
  };

  const updateEditField = (field: string, value: string | number | null) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ---------- Render ---------- */

  if (loading) {return <LoadingState message="Loading lead..." />;}
  if (error !== null || !lead) {
    return (
      <Box>
        <Button variant="ghost" size="sm" mb="4" onClick={() => router.push('/admin/leads')}>
          <ArrowLeft size={16} /> Back to Leads
        </Button>
        <ErrorState message={error ?? 'Lead not found'} onRetry={() => void fetchLead()} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Flex align="center" justify="space-between" mb="6" wrap="wrap" gap="3">
        <Flex align="center" gap="3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/leads')}>
            <ArrowLeft size={16} /> Back
          </Button>
          <Heading size="lg">{lead.parentName}</Heading>
          <Badge colorPalette={STATUS_COLORS[lead.status] ?? 'gray'} size="lg">
            {STATUS_LABELS[lead.status] ?? lead.status}
          </Badge>
        </Flex>
        <Flex gap="2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendTrialLink}
            loading={sendingTrial}
            loadingText="Sending..."
          >
            <Send size={14} /> Send Trial Link
          </Button>
          {!editing && (
            <Button size="sm" colorPalette="blue" onClick={startEditing}>
              <Edit2 size={14} /> Edit
            </Button>
          )}
        </Flex>
      </Flex>

      {/* Lead Info */}
      <Box borderWidth="1px" borderRadius="lg" p="5" mb="6">
        <Heading size="md" mb="4">Lead Information</Heading>
        {editing ? (
          <Flex direction="column" gap="4">
            <Flex gap="4" direction={{ base: 'column', md: 'row' }}>
              <FieldGroup label="Parent Name" flex="1">
                <Input
                  value={editForm.parentName ?? ''}
                  onChange={(e) => updateEditField('parentName', e.target.value)}
                />
              </FieldGroup>
              <FieldGroup label="Email" flex="1">
                <Input
                  type="email"
                  value={editForm.email ?? ''}
                  onChange={(e) => updateEditField('email', e.target.value)}
                />
              </FieldGroup>
            </Flex>
            <Flex gap="4" direction={{ base: 'column', md: 'row' }}>
              <FieldGroup label="Phone" flex="1">
                <Input
                  value={editForm.phone ?? ''}
                  onChange={(e) => updateEditField('phone', e.target.value || null)}
                />
              </FieldGroup>
              <FieldGroup label="Child Name" flex="1">
                <Input
                  value={editForm.childName ?? ''}
                  onChange={(e) => updateEditField('childName', e.target.value || null)}
                />
              </FieldGroup>
            </Flex>
            <Flex gap="4" direction={{ base: 'column', md: 'row' }}>
              <FieldGroup label="Child Age" flex="1">
                <Input
                  type="number"
                  value={editForm.childAge ?? ''}
                  onChange={(e) =>
                    updateEditField('childAge', e.target.value ? Number(e.target.value) : null)
                  }
                />
              </FieldGroup>
              <FieldGroup label="Source" flex="1">
                <select
                  value={editForm.source ?? ''}
                  onChange={(e) => updateEditField('source', e.target.value)}
                  style={selectStyle}
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{SOURCE_LABELS[s] ?? s}</option>
                  ))}
                </select>
              </FieldGroup>
            </Flex>
            <Flex gap="4" direction={{ base: 'column', md: 'row' }}>
              <FieldGroup label="Status" flex="1">
                <select
                  value={editForm.status ?? ''}
                  onChange={(e) => updateEditField('status', e.target.value)}
                  style={selectStyle}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                  ))}
                </select>
              </FieldGroup>
              <FieldGroup label="Interested Program ID" flex="1">
                <Input
                  value={editForm.interestedProgramId ?? ''}
                  onChange={(e) => updateEditField('interestedProgramId', e.target.value || null)}
                  placeholder="Program ID"
                />
              </FieldGroup>
            </Flex>
            <Flex gap="2" justify="flex-end" mt="2">
              <Button size="sm" variant="outline" onClick={cancelEditing}>
                <X size={14} /> Cancel
              </Button>
              <Button size="sm" colorPalette="blue" onClick={handleSave} loading={saving} loadingText="Saving...">
                <Save size={14} /> Save
              </Button>
            </Flex>
          </Flex>
        ) : (
          <Flex direction="column" gap="3">
            <InfoRow label="Parent Name" value={lead.parentName} />
            <InfoRow label="Email" value={lead.email} />
            <InfoRow label="Phone" value={lead.phone ?? '-'} />
            <InfoRow label="Child Name" value={lead.childName ?? '-'} />
            <InfoRow label="Child Age" value={lead.childAge !== null && lead.childAge !== undefined ? String(lead.childAge) : '-'} />
            <InfoRow label="Source" value={SOURCE_LABELS[lead.source] ?? lead.source} />
            <InfoRow label="Interested Program" value={lead.interestedProgramName ?? lead.interestedProgramId ?? '-'} />
            <InfoRow label="Created" value={formatDateTime(lead.createdAt)} />
            <InfoRow label="Last Updated" value={formatDateTime(lead.updatedAt)} />
          </Flex>
        )}
      </Box>

      {/* Notes Section */}
      <Box borderWidth="1px" borderRadius="lg" p="5" mb="6">
        <Flex align="center" gap="2" mb="4">
          <MessageSquare size={18} />
          <Heading size="md">Notes</Heading>
        </Flex>

        {notes.length > 0 ? (
          <Flex direction="column" gap="3" mb="4">
            {notes.map((note) => (
              <Box key={note.noteId} bg="gray.50" p="3" borderRadius="md">
                <Text whiteSpace="pre-wrap">{note.content}</Text>
                <Text fontSize="xs" color="gray.500" mt="1">
                  {formatDateTime(note.createdAt)}
                </Text>
              </Box>
            ))}
          </Flex>
        ) : (
          <Text color="gray.500" mb="4" fontSize="sm">No notes yet.</Text>
        )}

        <Flex gap="2" direction="column">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
          />
          <Flex justify="flex-end">
            <Button
              size="sm"
              colorPalette="blue"
              onClick={handleAddNote}
              loading={addingNote}
              loadingText="Adding..."
              disabled={!newNote.trim()}
            >
              <Plus size={14} /> Add Note
            </Button>
          </Flex>
        </Flex>
      </Box>

      {/* Activity Timeline */}
      <Box borderWidth="1px" borderRadius="lg" p="5">
        <Flex align="center" gap="2" mb="4">
          <Activity size={18} />
          <Heading size="md">Activity</Heading>
        </Flex>

        {activities.length > 0 ? (
          <Flex direction="column" gap="3">
            {activities.map((act) => (
              <Flex key={act.activityId} gap="3" align="flex-start">
                <Box
                  mt="1"
                  w="8px"
                  h="8px"
                  borderRadius="full"
                  bg="blue.400"
                  flexShrink={0}
                />
                <Box>
                  <Text fontSize="sm">{act.description}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatDateTime(act.createdAt)}
                  </Text>
                </Box>
              </Flex>
            ))}
          </Flex>
        ) : (
          <Text color="gray.500" fontSize="sm">No activity recorded.</Text>
        )}
      </Box>
    </Box>
  );
}

/* ---------- Helper Components ---------- */

function FieldGroup({
  label,
  children,
  flex,
}: {
  label: string;
  children: React.ReactNode;
  flex?: string;
}) {
  return (
    <Box flex={flex}>
      <Text fontWeight="500" mb="1" fontSize="sm">{label}</Text>
      {children}
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex gap="2" direction={{ base: 'column', sm: 'row' }}>
      <Text fontWeight="500" fontSize="sm" minW="160px" color="gray.600">
        {label}
      </Text>
      <Text fontSize="sm">{value}</Text>
    </Flex>
  );
}
