'use client';

import { Box, Flex, Heading, Text, Button, Input, Textarea, Spinner, Badge } from '@chakra-ui/react';
import { Plus, X } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/client/components/ui/ScreenStates';
import { toaster } from '@/client/lib/toaster';

// --------------- Types ---------------

interface TemplateSummary {
  templateId: string;
  name: string;
  subject: string;
  triggerEvent: string | null;
  isDefault: boolean;
  updatedAt: string;
}

interface TemplateDetail {
  templateId: string;
  name: string;
  subject: string;
  body: string;
  availableVariables: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// --------------- Component ---------------

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<{ templates: TemplateSummary[] }>('/api/communications/templates');
      setTemplates(data.templates);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load templates';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTemplates(); }, [fetchTemplates]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormSubject('');
    setFormBody('');
    setModalOpen(true);
  };

  const openEditModal = (templateId: string) => { void doOpenEditModal(templateId); };
  const doOpenEditModal = async (templateId: string) => {
    setEditingId(templateId);
    setModalOpen(true);
    setModalLoading(true);
    try {
      const data = await api.get<TemplateDetail>(`/api/communications/templates/${templateId}`);
      setFormName(data.name);
      setFormSubject(data.subject);
      setFormBody(data.body);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load template';
      toaster.error({ title: 'Error', description: msg });
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSave = () => { void doSave(); };
  const doSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/communications/templates/${editingId}`, { name: formName, subject: formSubject, body: formBody });
        toaster.success({ title: 'Saved', description: 'Template updated successfully.' });
      } else {
        await api.post('/api/communications/templates', { name: formName, subject: formSubject, body: formBody });
        toaster.success({ title: 'Created', description: 'Template created successfully.' });
      }
      setModalOpen(false);
      void fetchTemplates();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save template';
      toaster.error({ title: 'Error', description: msg });
    } finally {
      setSaving(false);
    }
  };

  // --------------- Render ---------------

  if (loading) {return <LoadingState message="Loading templates..." />;}
  if (error) {return <ErrorState message={error} onRetry={() => void fetchTemplates()} />;}

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="6">
        <Heading size="lg">Email Templates</Heading>
        <Button colorPalette="blue" size="sm" onClick={openCreateModal}>
          <Plus size={16} /> Create Template
        </Button>
      </Flex>

      {/* Table */}
      {templates.length === 0 ? (
        <EmptyState
          title="No templates"
          message="Create your first email template to get started."
          action={
            <Button colorPalette="blue" size="sm" onClick={openCreateModal}>
              <Plus size={16} /> Create Template
            </Button>
          }
        />
      ) : (
        <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
          <Box as="table" w="100%" fontSize="sm">
            <Box as="thead" bg="gray.50">
              <Box as="tr">
                <Box as="th" textAlign="left" p="3" fontWeight="600">Name</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Subject</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Trigger Event</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Default</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Last Updated</Box>
              </Box>
            </Box>
            <Box as="tbody">
              {templates.map((t) => (
                <Box
                  as="tr"
                  key={t.templateId}
                  _hover={{ bg: 'gray.50' }}
                  cursor="pointer"
                  onClick={() => openEditModal(t.templateId)}
                >
                  <Box as="td" p="3" fontWeight="500">{t.name}</Box>
                  <Box as="td" p="3">{t.subject}</Box>
                  <Box as="td" p="3">{t.triggerEvent ?? '—'}</Box>
                  <Box as="td" p="3">
                    {t.isDefault && <Badge colorPalette="blue">Default</Badge>}
                  </Box>
                  <Box as="td" p="3" color="gray.500">
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Modal */}
      {modalOpen && (
        <Box position="fixed" inset="0" bg="blackAlpha.600" zIndex="1400" display="flex" alignItems="center" justifyContent="center">
          <Box bg="white" borderRadius="lg" p="6" maxW="lg" w="90%" maxH="80vh" overflow="auto">
            <Flex justify="space-between" align="center" mb="4">
              <Heading size="md">{editingId ? 'Edit Template' : 'Create Template'}</Heading>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </Button>
            </Flex>

            {modalLoading ? (
              <Flex justify="center" py="8"><Spinner size="lg" /></Flex>
            ) : (
              <Flex direction="column" gap="4">
                <Box>
                  <Text fontWeight="500" mb="1" fontSize="sm">Name</Text>
                  <Input
                    placeholder="Template name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </Box>
                <Box>
                  <Text fontWeight="500" mb="1" fontSize="sm">Subject</Text>
                  <Input
                    placeholder="Email subject"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                  />
                </Box>
                <Box>
                  <Text fontWeight="500" mb="1" fontSize="sm">Body</Text>
                  <Textarea
                    placeholder="Email body (HTML or plain text)"
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    rows={10}
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
                    disabled={saving || !formName.trim() || !formSubject.trim()}
                  >
                    {saving ? <Spinner size="sm" /> : 'Save'}
                  </Button>
                </Flex>
              </Flex>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
