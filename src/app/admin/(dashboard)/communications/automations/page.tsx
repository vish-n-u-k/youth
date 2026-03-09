'use client';

import { Box, Flex, Heading, Text, Button, Input, Spinner, Badge } from '@chakra-ui/react';
import { X } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/client/components/ui/ScreenStates';
import { toaster } from '@/client/lib/toaster';

// --------------- Types ---------------

interface Automation {
  automationId: string;
  triggerEvent: string;
  templateId: string;
  templateName: string;
  enabled: boolean;
  delayMinutes: number;
  updatedAt: string;
}

interface TemplateSummary {
  templateId: string;
  name: string;
  subject: string;
  triggerEvent: string | null;
  isDefault: boolean;
  updatedAt: string;
}

// --------------- Component ---------------

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formEnabled, setFormEnabled] = useState(false);
  const [formTemplateId, setFormTemplateId] = useState('');
  const [formDelay, setFormDelay] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [automationsRes, templatesRes] = await Promise.all([
        api.get<{ automations: Automation[] }>('/api/communications/automations'),
        api.get<{ templates: TemplateSummary[] }>('/api/communications/templates'),
      ]);
      setAutomations(automationsRes.automations);
      setTemplates(templatesRes.templates);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load automations';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const openEditModal = (automation: Automation) => {
    setEditingAutomation(automation);
    setFormEnabled(automation.enabled);
    setFormTemplateId(automation.templateId);
    setFormDelay(automation.delayMinutes);
    setModalOpen(true);
  };

  const handleSave = () => { void doSave(); };
  const doSave = async () => {
    if (!editingAutomation) {return;}
    setSaving(true);
    try {
      await api.put(`/api/communications/automations/${editingAutomation.automationId}`, {
        enabled: formEnabled,
        templateId: formTemplateId,
        delayMinutes: formDelay,
      });
      toaster.success({ title: 'Saved', description: 'Automation updated successfully.' });
      setModalOpen(false);
      void fetchData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save automation';
      toaster.error({ title: 'Error', description: msg });
    } finally {
      setSaving(false);
    }
  };

  // --------------- Render ---------------

  if (loading) {return <LoadingState message="Loading automations..." />;}
  if (error) {return <ErrorState message={error} onRetry={() => void fetchData()} />;}

  return (
    <Box>
      <Flex justify="space-between" align="center" mb="6">
        <Heading size="lg">Automations</Heading>
      </Flex>

      {automations.length === 0 ? (
        <EmptyState title="No automations" message="No automations have been configured yet." />
      ) : (
        <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
          <Box as="table" w="100%" fontSize="sm">
            <Box as="thead" bg="gray.50">
              <Box as="tr">
                <Box as="th" textAlign="left" p="3" fontWeight="600">Trigger Event</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Template</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Enabled</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Delay (min)</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Last Updated</Box>
              </Box>
            </Box>
            <Box as="tbody">
              {automations.map((a) => (
                <Box
                  as="tr"
                  key={a.automationId}
                  _hover={{ bg: 'gray.50' }}
                  cursor="pointer"
                  onClick={() => openEditModal(a)}
                >
                  <Box as="td" p="3" fontWeight="500">{a.triggerEvent}</Box>
                  <Box as="td" p="3">{a.templateName}</Box>
                  <Box as="td" p="3">
                    <Badge colorPalette={a.enabled ? 'green' : 'gray'}>
                      {a.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </Box>
                  <Box as="td" p="3">{a.delayMinutes}</Box>
                  <Box as="td" p="3" color="gray.500">
                    {new Date(a.updatedAt).toLocaleDateString()}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Edit Modal */}
      {modalOpen && editingAutomation && (
        <Box position="fixed" inset="0" bg="blackAlpha.600" zIndex="1400" display="flex" alignItems="center" justifyContent="center">
          <Box bg="white" borderRadius="lg" p="6" maxW="md" w="90%" maxH="80vh" overflow="auto">
            <Flex justify="space-between" align="center" mb="4">
              <Heading size="md">Edit Automation</Heading>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </Button>
            </Flex>

            <Flex direction="column" gap="4">
              <Box>
                <Text fontWeight="500" mb="1" fontSize="sm">Trigger Event</Text>
                <Text color="gray.600">{editingAutomation.triggerEvent}</Text>
              </Box>

              <Box>
                <Text fontWeight="500" mb="1" fontSize="sm">Enabled</Text>
                <Flex align="center" gap="3">
                  <Box
                    as="button"
                    w="44px"
                    h="24px"
                    borderRadius="full"
                    bg={formEnabled ? 'blue.500' : 'gray.300'}
                    position="relative"
                    cursor="pointer"
                    transition="background 0.2s"
                    onClick={() => setFormEnabled(!formEnabled)}
                    flexShrink={0}
                  >
                    <Box
                      position="absolute"
                      top="2px"
                      left={formEnabled ? '22px' : '2px'}
                      w="20px"
                      h="20px"
                      borderRadius="full"
                      bg="white"
                      transition="left 0.2s"
                      boxShadow="sm"
                    />
                  </Box>
                  <Text fontSize="sm" color="gray.600">{formEnabled ? 'On' : 'Off'}</Text>
                </Flex>
              </Box>

              <Box>
                <Text fontWeight="500" mb="1" fontSize="sm">Template</Text>
                <select
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                  value={formTemplateId}
                  onChange={(e) => setFormTemplateId(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.templateId} value={t.templateId}>{t.name}</option>
                  ))}
                </select>
              </Box>

              <Box>
                <Text fontWeight="500" mb="1" fontSize="sm">Delay (minutes)</Text>
                <Input
                  type="number"
                  min={0}
                  value={formDelay}
                  onChange={(e) => setFormDelay(Number(e.target.value))}
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
                  disabled={saving || !formTemplateId}
                >
                  {saving ? <Spinner size="sm" /> : 'Save'}
                </Button>
              </Flex>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  );
}
