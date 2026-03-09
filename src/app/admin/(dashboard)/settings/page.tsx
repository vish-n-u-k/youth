'use client';

import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  Textarea,
  Button,
  Separator,
  Switch,
} from '@chakra-ui/react';
import { Save } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState } from '@/client/components/ui/ScreenStates';
import { toaster } from '@/client/lib/toaster';

interface Settings {
  locationId: string;
  businessName: string;
  address: string;
  phone: string;
  email: string;
  websiteUrl: string | null;
  zelleRecipientName: string;
  zelleContactInfo: string;
  zelleInstructions: string | null;
  notifyNewLead: boolean;
  notifyNewEnrollment: boolean;
  notifyPaymentReceived: boolean;
}

const INITIAL_SETTINGS: Settings = {
  locationId: '',
  businessName: '',
  address: '',
  phone: '',
  email: '',
  websiteUrl: null,
  zelleRecipientName: '',
  zelleContactInfo: '',
  zelleInstructions: null,
  notifyNewLead: true,
  notifyNewEnrollment: true,
  notifyPaymentReceived: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Settings>('/api/settings');
      setSettings(data);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to load settings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleChange = (field: keyof Settings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => { void doSave(); };
  const doSave = async () => {
    setSaving(true);
    try {
      const updated = await api.put<Settings>('/api/settings', settings);
      setSettings(updated);
      toaster.success({ title: 'Saved', description: 'Settings updated successfully.' });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to save settings';
      toaster.error({ title: 'Error', description: message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {return <LoadingState message="Loading settings..." />;}
  if (error) {return <ErrorState message={error} onRetry={() => void fetchSettings()} />;}

  return (
    <Box>
      <Heading size="lg" mb="6">Settings</Heading>

      {/* Business Info */}
      <Box mb="8">
        <Heading size="md" mb="4">Business Info</Heading>
        <Flex direction="column" gap="4">
          <FieldGroup label="Business Name">
            <Input
              value={settings.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Address">
            <Textarea
              value={settings.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={2}
            />
          </FieldGroup>
          <Flex gap="4" direction={{ base: 'column', md: 'row' }}>
            <FieldGroup label="Phone" flex="1">
              <Input
                value={settings.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </FieldGroup>
            <FieldGroup label="Email" flex="1">
              <Input
                type="email"
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </FieldGroup>
          </Flex>
          <FieldGroup label="Website URL">
            <Input
              value={settings.websiteUrl ?? ''}
              onChange={(e) =>
                handleChange('websiteUrl', e.target.value || '')
              }
              placeholder="https://example.com"
            />
          </FieldGroup>
        </Flex>
      </Box>

      <Separator mb="8" />

      {/* Zelle Configuration */}
      <Box mb="8">
        <Heading size="md" mb="4">Zelle Configuration</Heading>
        <Flex direction="column" gap="4">
          <FieldGroup label="Recipient Name">
            <Input
              value={settings.zelleRecipientName}
              onChange={(e) =>
                handleChange('zelleRecipientName', e.target.value)
              }
            />
          </FieldGroup>
          <FieldGroup label="Contact Info">
            <Input
              value={settings.zelleContactInfo}
              onChange={(e) =>
                handleChange('zelleContactInfo', e.target.value)
              }
              placeholder="Email or phone for Zelle"
            />
          </FieldGroup>
          <FieldGroup label="Instructions">
            <Textarea
              value={settings.zelleInstructions ?? ''}
              onChange={(e) =>
                handleChange('zelleInstructions', e.target.value || '')
              }
              rows={3}
              placeholder="Payment instructions for parents..."
            />
          </FieldGroup>
        </Flex>
      </Box>

      <Separator mb="8" />

      {/* Notification Preferences */}
      <Box mb="8">
        <Heading size="md" mb="4">Notification Preferences</Heading>
        <Flex direction="column" gap="4">
          <ToggleRow
            label="New Lead"
            description="Receive notifications when a new lead is submitted"
            checked={settings.notifyNewLead}
            onCheckedChange={(val) => handleChange('notifyNewLead', val)}
          />
          <ToggleRow
            label="New Enrollment"
            description="Receive notifications when a new enrollment is created"
            checked={settings.notifyNewEnrollment}
            onCheckedChange={(val) => handleChange('notifyNewEnrollment', val)}
          />
          <ToggleRow
            label="Payment Received"
            description="Receive notifications when a payment is received"
            checked={settings.notifyPaymentReceived}
            onCheckedChange={(val) =>
              handleChange('notifyPaymentReceived', val)
            }
          />
        </Flex>
      </Box>

      <Separator mb="6" />

      {/* Save Button */}
      <Flex justify="flex-end">
        <Button
          colorPalette="blue"
          onClick={handleSave}
          loading={saving}
          loadingText="Saving..."
        >
          <Save size={16} />
          Save Settings
        </Button>
      </Flex>
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
      <Text fontWeight="500" mb="1" fontSize="sm">
        {label}
      </Text>
      {children}
    </Box>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
}) {
  return (
    <Flex align="center" justify="space-between" py="2">
      <Box>
        <Text fontWeight="500">{label}</Text>
        <Text fontSize="sm" color="gray.500">
          {description}
        </Text>
      </Box>
      <Switch.Root
        checked={checked}
        onCheckedChange={(e) => onCheckedChange(e.checked)}
      >
        <Switch.HiddenInput />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Root>
    </Flex>
  );
}
