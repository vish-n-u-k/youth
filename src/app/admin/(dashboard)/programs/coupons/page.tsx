'use client';

import { Box, Flex, Heading, Text, Button, Input, Badge, Spinner } from '@chakra-ui/react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { LoadingState, ErrorState, EmptyState } from '@/client/components/ui/ScreenStates';
import { toaster } from '@/client/lib/toaster';

// --------------- Types ---------------

interface Coupon {
  couponId: string;
  code: string;
  discountType: string;
  discountValue: number;
  scope: string;
  expiresAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  createdAt: string;
}

interface CouponForm {
  code: string;
  discountType: string;
  discountValue: string;
  scope: string;
  expiresAt: string;
  usageLimit: string;
}

const EMPTY_FORM: CouponForm = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  scope: 'all',
  expiresAt: '',
  usageLimit: '',
};

function formatDiscount(type: string, value: number): string {
  return type === 'percentage' ? `${value}%` : `$${value.toFixed(2)}`;
}

function toISODate(iso: string | null): string {
  if (!iso) {return '';}
  return iso.slice(0, 10);
}

// --------------- Component ---------------

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<{ coupons: Coupon[] }>('/api/coupons');
      setCoupons(data.coupons);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load coupons';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCoupons(); }, [fetchCoupons]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingId(coupon.couponId);
    setForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      scope: coupon.scope,
      expiresAt: toISODate(coupon.expiresAt),
      usageLimit: coupon.usageLimit !== null && coupon.usageLimit !== undefined ? String(coupon.usageLimit) : '',
    });
    setModalOpen(true);
  };

  const handleSave = () => { void doSave(); };
  const doSave = async () => {
    setSaving(true);
    try {
      const body = {
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        scope: form.scope,
        expiresAt: form.expiresAt || null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      };

      if (editingId) {
        await api.put(`/api/coupons/${editingId}`, body);
        toaster.success({ title: 'Saved', description: 'Coupon updated successfully.' });
      } else {
        await api.post('/api/coupons', body);
        toaster.success({ title: 'Created', description: 'Coupon created successfully.' });
      }
      setModalOpen(false);
      void fetchCoupons();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save coupon';
      toaster.error({ title: 'Error', description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (couponId: string) => { void doDelete(couponId); };
  const doDelete = async (couponId: string) => {
    // eslint-disable-next-line no-alert
    if (!confirm('Are you sure you want to delete this coupon?')) {return;}
    setDeleting(couponId);
    try {
      await api.delete(`/api/coupons/${couponId}`);
      toaster.success({ title: 'Deleted', description: 'Coupon deleted successfully.' });
      void fetchCoupons();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete coupon';
      toaster.error({ title: 'Error', description: msg });
    } finally {
      setDeleting(null);
    }
  };

  const updateField = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // --------------- Render ---------------

  if (loading) {return <LoadingState message="Loading coupons..." />;}
  if (error) {return <ErrorState message={error} onRetry={() => void fetchCoupons()} />;}

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb="6">
        <Heading size="lg">Coupons</Heading>
        <Button colorPalette="blue" size="sm" onClick={openCreateModal}>
          <Plus size={16} /> Create Coupon
        </Button>
      </Flex>

      {/* Table */}
      {coupons.length === 0 ? (
        <EmptyState
          title="No coupons"
          message="Create your first coupon to offer discounts."
          action={
            <Button colorPalette="blue" size="sm" onClick={openCreateModal}>
              <Plus size={16} /> Create Coupon
            </Button>
          }
        />
      ) : (
        <Box overflowX="auto" borderWidth="1px" borderRadius="lg">
          <Box as="table" w="100%" fontSize="sm">
            <Box as="thead" bg="gray.50">
              <Box as="tr">
                <Box as="th" textAlign="left" p="3" fontWeight="600">Code</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Discount</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Scope</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Expires</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Usage</Box>
                <Box as="th" textAlign="left" p="3" fontWeight="600">Actions</Box>
              </Box>
            </Box>
            <Box as="tbody">
              {coupons.map((c) => (
                <Box as="tr" key={c.couponId} _hover={{ bg: 'gray.50' }}>
                  <Box as="td" p="3" fontWeight="500">
                    <Badge variant="outline">{c.code}</Badge>
                  </Box>
                  <Box as="td" p="3">
                    {formatDiscount(c.discountType, c.discountValue)}
                  </Box>
                  <Box as="td" p="3">{c.scope}</Box>
                  <Box as="td" p="3" color="gray.600">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
                  </Box>
                  <Box as="td" p="3">
                    {c.usageCount}/{c.usageLimit ?? '∞'}
                  </Box>
                  <Box as="td" p="3">
                    <Flex gap="2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(c)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        colorPalette="red"
                        onClick={() => handleDelete(c.couponId)}
                        disabled={deleting === c.couponId}
                      >
                        {deleting === c.couponId ? <Spinner size="sm" /> : <Trash2 size={14} />}
                      </Button>
                    </Flex>
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
            onClick={(e) => e.stopPropagation()}
          >
            <Flex justify="space-between" align="center" mb="4">
              <Heading size="md">{editingId ? 'Edit Coupon' : 'Create Coupon'}</Heading>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </Button>
            </Flex>

            <Flex direction="column" gap="4">
              {/* Code */}
              <Box>
                <Text fontWeight="500" mb="1" fontSize="sm">Code</Text>
                <Input
                  placeholder="e.g. SUMMER20"
                  value={form.code}
                  onChange={(e) => updateField('code', e.target.value)}
                />
              </Box>

              {/* Discount Type & Value */}
              <Flex gap="4">
                <Box flex="1">
                  <Text fontWeight="500" mb="1" fontSize="sm">Discount Type</Text>
                  <select
                    value={form.discountType}
                    onChange={(e) => updateField('discountType', e.target.value)}
                    style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', width: '100%', background: 'white' }}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </Box>
                <Box flex="1">
                  <Text fontWeight="500" mb="1" fontSize="sm">Discount Value</Text>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={form.discountType === 'percentage' ? '20' : '10.00'}
                    value={form.discountValue}
                    onChange={(e) => updateField('discountValue', e.target.value)}
                  />
                </Box>
              </Flex>

              {/* Scope */}
              <Box>
                <Text fontWeight="500" mb="1" fontSize="sm">Scope</Text>
                <select
                  value={form.scope}
                  onChange={(e) => updateField('scope', e.target.value)}
                  style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', width: '100%', background: 'white' }}
                >
                  <option value="all">All Programs</option>
                  <option value="program">Specific Program</option>
                </select>
              </Box>

              {/* Expires At */}
              <Box>
                <Text fontWeight="500" mb="1" fontSize="sm">Expires At (optional)</Text>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => updateField('expiresAt', e.target.value)}
                />
              </Box>

              {/* Usage Limit */}
              <Box>
                <Text fontWeight="500" mb="1" fontSize="sm">Usage Limit (optional)</Text>
                <Input
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={form.usageLimit}
                  onChange={(e) => updateField('usageLimit', e.target.value)}
                />
              </Box>

              {/* Actions */}
              <Flex justify="flex-end" gap="3" mt="2">
                <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  colorPalette="blue"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !form.code.trim() || !form.discountValue}
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
