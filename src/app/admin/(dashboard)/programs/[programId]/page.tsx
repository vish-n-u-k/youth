'use client';

import { Box, Flex, Heading, Text, Button, Input, Switch, Spinner } from '@chakra-ui/react';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
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
  totalSessions: number;
  sessionDuration: number;
  location: string;
  startDate: string;
  endDate: string;
  capacity: number;
  status: string;
  baseFee: number;
  feeType: string;
  totalFee: number;
  registrationFee: number;
  registrationFeeRequired: boolean;
  trialAvailable: boolean;
  locationId: string;
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ProgramForm {
  name: string;
  ageGroupMin: string;
  ageGroupMax: string;
  totalSessions: string;
  sessionDuration: string;
  location: string;
  startDate: string;
  endDate: string;
  capacity: string;
  status: string;
  baseFee: string;
  feeType: string;
  registrationFee: string;
  registrationFeeRequired: boolean;
  trialAvailable: boolean;
}

const EMPTY_FORM: ProgramForm = {
  name: '',
  ageGroupMin: '',
  ageGroupMax: '',
  totalSessions: '',
  sessionDuration: '',
  location: '',
  startDate: '',
  endDate: '',
  capacity: '',
  status: 'draft',
  baseFee: '',
  feeType: 'per_session',
  registrationFee: '',
  registrationFeeRequired: false,
  trialAvailable: false,
};

function toISODate(iso: string): string {
  if (!iso) {return '';}
  return iso.slice(0, 10);
}

// --------------- Component ---------------

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;
  const isNew = programId === 'new';

  const [form, setForm] = useState<ProgramForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProgram = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<ProgramDetail>(`/api/programs/${programId}`);
      setForm({
        name: data.name,
        ageGroupMin: String(data.ageGroupMin),
        ageGroupMax: String(data.ageGroupMax),
        totalSessions: String(data.totalSessions),
        sessionDuration: String(data.sessionDuration),
        location: data.location ?? '',
        startDate: toISODate(data.startDate),
        endDate: toISODate(data.endDate),
        capacity: String(data.capacity),
        status: data.status,
        baseFee: String(data.baseFee),
        feeType: data.feeType,
        registrationFee: String(data.registrationFee),
        registrationFeeRequired: data.registrationFeeRequired,
        trialAvailable: data.trialAvailable,
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load program';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    if (!isNew) {void fetchProgram();}
  }, [isNew, fetchProgram]);

  const updateField = <K extends keyof ProgramForm>(key: K, value: ProgramForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => { void doSave(); };
  const doSave = async () => {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        ageGroupMin: Number(form.ageGroupMin),
        ageGroupMax: Number(form.ageGroupMax),
        totalSessions: Number(form.totalSessions),
        sessionDuration: Number(form.sessionDuration),
        location: form.location,
        startDate: form.startDate,
        endDate: form.endDate,
        capacity: Number(form.capacity),
        status: form.status,
        baseFee: Number(form.baseFee),
        feeType: form.feeType,
        registrationFee: Number(form.registrationFee),
        registrationFeeRequired: form.registrationFeeRequired,
        trialAvailable: form.trialAvailable,
      };

      if (isNew) {
        await api.post('/api/programs', body);
        toaster.success({ title: 'Created', description: 'Program created successfully.' });
      } else {
        await api.put(`/api/programs/${programId}`, body);
        toaster.success({ title: 'Saved', description: 'Program updated successfully.' });
      }
      router.push('/admin/programs');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save program';
      toaster.error({ title: 'Error', description: msg });
    } finally {
      setSaving(false);
    }
  };

  // --------------- Render ---------------

  if (loading) {return <LoadingState message="Loading program..." />;}
  if (error) {return <ErrorState message={error} onRetry={() => void fetchProgram()} />;}

  return (
    <Box maxW="800px">
      {/* Header */}
      <Flex align="center" gap="3" mb="6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/programs')}>
          <ArrowLeft size={18} />
        </Button>
        <Heading size="lg">{isNew ? 'Create Program' : 'Edit Program'}</Heading>
      </Flex>

      {/* Form */}
      <Flex direction="column" gap="5">
        {/* Name */}
        <FormField label="Program Name">
          <Input
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g. Summer Swimming"
          />
        </FormField>

        {/* Age Group */}
        <Flex gap="4">
          <FormField label="Age Min" flex="1">
            <Input
              type="number"
              value={form.ageGroupMin}
              onChange={(e) => updateField('ageGroupMin', e.target.value)}
              placeholder="3"
            />
          </FormField>
          <FormField label="Age Max" flex="1">
            <Input
              type="number"
              value={form.ageGroupMax}
              onChange={(e) => updateField('ageGroupMax', e.target.value)}
              placeholder="6"
            />
          </FormField>
        </Flex>

        {/* Sessions */}
        <Flex gap="4">
          <FormField label="Total Sessions" flex="1">
            <Input
              type="number"
              value={form.totalSessions}
              onChange={(e) => updateField('totalSessions', e.target.value)}
              placeholder="12"
            />
          </FormField>
          <FormField label="Session Duration (min)" flex="1">
            <Input
              type="number"
              value={form.sessionDuration}
              onChange={(e) => updateField('sessionDuration', e.target.value)}
              placeholder="60"
            />
          </FormField>
        </Flex>

        {/* Location */}
        <FormField label="Location">
          <Input
            value={form.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="Main Pool"
          />
        </FormField>

        {/* Dates */}
        <Flex gap="4">
          <FormField label="Start Date" flex="1">
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => updateField('startDate', e.target.value)}
            />
          </FormField>
          <FormField label="End Date" flex="1">
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => updateField('endDate', e.target.value)}
            />
          </FormField>
        </Flex>

        {/* Capacity & Status */}
        <Flex gap="4">
          <FormField label="Capacity" flex="1">
            <Input
              type="number"
              value={form.capacity}
              onChange={(e) => updateField('capacity', e.target.value)}
              placeholder="20"
            />
          </FormField>
          <FormField label="Status" flex="1">
            <select
              value={form.status}
              onChange={(e) => updateField('status', e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', width: '100%', background: 'white' }}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </FormField>
        </Flex>

        {/* Pricing */}
        <Flex gap="4">
          <FormField label="Base Fee ($)" flex="1">
            <Input
              type="number"
              step="0.01"
              value={form.baseFee}
              onChange={(e) => updateField('baseFee', e.target.value)}
              placeholder="25.00"
            />
          </FormField>
          <FormField label="Fee Type" flex="1">
            <select
              value={form.feeType}
              onChange={(e) => updateField('feeType', e.target.value)}
              style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', width: '100%', background: 'white' }}
            >
              <option value="per_session">Per Session</option>
              <option value="monthly">Monthly</option>
              <option value="total">Total</option>
            </select>
          </FormField>
        </Flex>

        {/* Registration Fee */}
        <FormField label="Registration Fee ($)">
          <Input
            type="number"
            step="0.01"
            value={form.registrationFee}
            onChange={(e) => updateField('registrationFee', e.target.value)}
            placeholder="0.00"
          />
        </FormField>

        {/* Toggles */}
        <Flex gap="8" flexWrap="wrap">
          <Flex align="center" gap="3">
            <Text fontWeight="500" fontSize="sm">Registration Fee Required</Text>
            <Switch.Root
              checked={form.registrationFeeRequired}
              onCheckedChange={(e) => updateField('registrationFeeRequired', e.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </Flex>
          <Flex align="center" gap="3">
            <Text fontWeight="500" fontSize="sm">Trial Available</Text>
            <Switch.Root
              checked={form.trialAvailable}
              onCheckedChange={(e) => updateField('trialAvailable', e.checked)}
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </Flex>
        </Flex>

        {/* Actions */}
        <Flex gap="3" mt="2">
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/programs')} disabled={saving}>
            Cancel
          </Button>
          <Button
            colorPalette="blue"
            size="sm"
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
          >
            {saving ? <Spinner size="sm" /> : isNew ? 'Create Program' : 'Save Changes'}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}

// --------------- Helpers ---------------

function FormField({
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
