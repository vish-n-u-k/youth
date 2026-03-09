'use client';

import { Box, Flex, Heading, Text, Button } from '@chakra-ui/react';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { api, ApiError } from '@/client/api/client';
import { toaster } from '@/client/lib/toaster';

// --------------- Types ---------------

interface PriceBreakdown {
  baseFee: number;
  discount: number;
  totalDue: number;
  couponApplied: boolean;
}

interface EnrollmentResponse {
  enrollmentId: string;
  programName: string;
  parentName: string;
  childName: string;
  totalDue: number;
  paymentStatus: string;
  confirmationEmailSent: boolean;
}

const fieldStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', background: 'white', width: '100%',
};

// --------------- Component ---------------

export default function EnrollPage() {
  const router = useRouter();
  const { programId } = useParams<{ programId: string }>();

  const [price, setPrice] = useState<PriceBreakdown | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchPrice = useCallback(async (coupon?: string) => {
    try {
      setPriceLoading(true);
      setPriceError(null);
      const body: Record<string, string> = {};
      if (coupon) {body.couponCode = coupon;}
      const data = await api.post<PriceBreakdown>(`/api/public/programs/${programId}/price`, body);
      setPrice(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load pricing';
      setPriceError(msg);
    } finally {
      setPriceLoading(false);
    }
  }, [programId]);

  useEffect(() => { void fetchPrice(); }, [fetchPrice]);

  const handleApplyCoupon = () => { void doApplyCoupon(); };
  const doApplyCoupon = async () => {
    if (!couponCode.trim()) {return;}
    try {
      setApplyingCoupon(true);
      await fetchPrice(couponCode.trim());
      toaster.success({ title: 'Coupon applied', description: 'Price updated with discount.' });
    } catch {
      toaster.error({ title: 'Invalid coupon', description: 'Could not apply coupon code.' });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void doSubmit();
  };
  const doSubmit = async () => {
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!parentName.trim()) {errors.parentName = 'Parent name is required';}
    if (!parentEmail.trim()) {errors.parentEmail = 'Email is required';}
    if (!parentPhone.trim()) {errors.parentPhone = 'Phone is required';}
    if (!childName.trim()) {errors.childName = 'Child name is required';}
    if (!childAge.trim() || isNaN(Number(childAge))) {errors.childAge = 'Valid age is required';}

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const payload: Record<string, unknown> = {
        programId,
        parentName: parentName.trim(),
        parentEmail: parentEmail.trim(),
        parentPhone: parentPhone.trim(),
        childName: childName.trim(),
        childAge: Number(childAge),
      };
      if (couponCode.trim()) {payload.couponCode = couponCode.trim();}

      const result = await api.post<EnrollmentResponse>('/api/public/enrollments', payload);
      toaster.success({ title: 'Enrolled!', description: `${result.childName} has been enrolled in ${result.programName}.` });
      router.push(`/enrollment/${result.enrollmentId}/confirmation`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && typeof err.details === 'object') {
          setFieldErrors(err.details as Record<string, string>);
        }
        toaster.error({ title: 'Enrollment failed', description: err.message });
      } else {
        toaster.error({ title: 'Enrollment failed', description: 'An unexpected error occurred.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --------------- Render ---------------

  return (
    <Box maxW="560px" mx="auto" py="8" px="4">
      <Button variant="ghost" size="sm" mb="4" onClick={() => router.push('/programs')}>
        <ArrowLeft size={16} /> Back to Programs
      </Button>

      <Heading size="lg" mb="6">Enroll Now</Heading>

      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <Box>
            <Text fontSize="sm" fontWeight="600" mb="1">Parent Name</Text>
            <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Full name" style={fieldStyle} />
            {fieldErrors.parentName && <Text fontSize="xs" color="red.500" mt="1">{fieldErrors.parentName}</Text>}
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="600" mb="1">Email</Text>
            <input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="email@example.com" style={fieldStyle} />
            {fieldErrors.parentEmail && <Text fontSize="xs" color="red.500" mt="1">{fieldErrors.parentEmail}</Text>}
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="600" mb="1">Phone</Text>
            <input type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="(555) 123-4567" style={fieldStyle} />
            {fieldErrors.parentPhone && <Text fontSize="xs" color="red.500" mt="1">{fieldErrors.parentPhone}</Text>}
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="600" mb="1">Child Name</Text>
            <input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Child's full name" style={fieldStyle} />
            {fieldErrors.childName && <Text fontSize="xs" color="red.500" mt="1">{fieldErrors.childName}</Text>}
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="600" mb="1">Child Age</Text>
            <input type="number" value={childAge} onChange={(e) => setChildAge(e.target.value)} placeholder="Age" min={1} max={18} style={fieldStyle} />
            {fieldErrors.childAge && <Text fontSize="xs" color="red.500" mt="1">{fieldErrors.childAge}</Text>}
          </Box>

          {/* Coupon */}
          <Box>
            <Text fontSize="sm" fontWeight="600" mb="1">Coupon Code (optional)</Text>
            <Flex gap="2">
              <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter code" style={fieldStyle} />
              <Button
                size="sm"
                variant="outline"
                onClick={handleApplyCoupon}
                disabled={applyingCoupon || !couponCode.trim()}
                flexShrink={0}
              >
                {applyingCoupon ? 'Applying...' : 'Apply'}
              </Button>
            </Flex>
          </Box>

          {/* Price Breakdown */}
          <Box borderWidth="1px" borderRadius="lg" p="4" bg="gray.50">
            <Heading size="sm" mb="3">Price Breakdown</Heading>
            {priceLoading ? (
              <Text fontSize="sm" color="gray.500">Loading price...</Text>
            ) : priceError ? (
              <Text fontSize="sm" color="red.500">{priceError}</Text>
            ) : price ? (
              <Flex direction="column" gap="2" fontSize="sm">
                <Flex justify="space-between">
                  <Text color="gray.600">Base Fee</Text>
                  <Text>${price.baseFee.toFixed(2)}</Text>
                </Flex>
                {price.discount > 0 && (
                  <Flex justify="space-between">
                    <Text color="green.600">Discount</Text>
                    <Text color="green.600">-${price.discount.toFixed(2)}</Text>
                  </Flex>
                )}
                <Box borderTopWidth="1px" pt="2">
                  <Flex justify="space-between">
                    <Text fontWeight="700">Total Due</Text>
                    <Text fontWeight="700">${price.totalDue.toFixed(2)}</Text>
                  </Flex>
                </Box>
                {price.couponApplied && (
                  <Text fontSize="xs" color="green.600">Coupon applied!</Text>
                )}
              </Flex>
            ) : null}
          </Box>

          <Button
            type="submit"
            colorPalette="green"
            size="lg"
            w="100%"
            mt="2"
            disabled={submitting}
          >
            {submitting ? 'Enrolling...' : 'Enroll Now'}
          </Button>
        </Flex>
      </form>
    </Box>
  );
}
