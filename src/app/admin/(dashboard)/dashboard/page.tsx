'use client';

import { Box, Flex, Heading, Text, Badge, SimpleGrid } from '@chakra-ui/react';
import { Users, ClipboardCheck, DollarSign, CreditCard, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, type ReactNode } from 'react';

import { api } from '@/client/api/client';
import { LoadingState } from '@/client/components/ui/ScreenStates';

/* ---------- Types ---------- */

interface DashboardStats {
  totalLeadsThisMonth: number;
  activeEnrollments: number;
  totalRevenue: number;
  pendingPayments: number;
}

interface RecentLead {
  leadId: string;
  parentName: string;
  email: string;
  status: string;
  createdAt: string;
}

interface UpcomingTrial {
  trialId: string;
  parentName: string;
  childName: string;
  programName: string;
  trialDate: string;
}

interface PendingPayment {
  paymentId: string;
  parentName: string;
  programName: string;
  amountDue: number;
  status: string;
  createdAt: string;
}

/* ---------- Helpers ---------- */

const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STATUS_COLORS: Record<string, string> = {
  new: 'blue',
  active: 'green',
  contacted: 'yellow',
  trial_scheduled: 'orange',
  enrolled: 'green',
  pending: 'yellow',
  partial: 'orange',
  overdue: 'red',
  paid: 'green',
  lost: 'gray',
};

/* ---------- Sub-components ---------- */

function MetricCard({
  icon,
  label,
  value,
  borderColor,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  borderColor: string;
}) {
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderRadius="lg"
      borderLeftWidth="4px"
      borderLeftColor={borderColor}
      p="5"
    >
      <Flex align="center" gap="4">
        <Flex
          align="center"
          justify="center"
          w="10"
          h="10"
          borderRadius="md"
          bg={`${borderColor.replace('.500', '.50')}`}
          flexShrink={0}
        >
          {icon}
        </Flex>
        <Box>
          <Text fontSize="sm" color="gray.500" mb="1">
            {label}
          </Text>
          <Text fontSize="2xl" fontWeight="700" lineHeight="1">
            {value}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
}

function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Flex direction="column" align="center" justify="center" py="8" gap="2">
      <AlertCircle size={28} color="#e53e3e" />
      <Text fontSize="sm" color="gray.500">{message}</Text>
      <Text
        as="button"
        fontSize="sm"
        color="blue.500"
        fontWeight="500"
        cursor="pointer"
        onClick={onRetry}
      >
        Try again
      </Text>
    </Flex>
  );
}

function WidgetBox({
  title,
  viewAllHref,
  children,
}: {
  title: string;
  viewAllHref: string;
  children: ReactNode;
}) {
  return (
    <Box bg="white" borderWidth="1px" borderRadius="lg" overflow="hidden">
      <Flex justify="space-between" align="center" px="5" py="4" borderBottomWidth="1px">
        <Heading size="sm">{title}</Heading>
        <Link href={viewAllHref}>
          <Text fontSize="sm" color="blue.500" fontWeight="500" _hover={{ textDecoration: 'underline' }}>
            View All
          </Text>
        </Link>
      </Flex>
      <Box px="5" py="3">
        {children}
      </Box>
    </Box>
  );
}

/* ---------- Main Component ---------- */

export default function DashboardPage() {
  const router = useRouter();

  // Stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Leads
  const [leads, setLeads] = useState<RecentLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  // Trials
  const [trials, setTrials] = useState<UpcomingTrial[]>([]);
  const [trialsLoading, setTrialsLoading] = useState(true);
  const [trialsError, setTrialsError] = useState<string | null>(null);

  // Payments
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setStatsLoading(true);
    setLeadsLoading(true);
    setTrialsLoading(true);
    setPaymentsLoading(true);
    setLeadsError(null);
    setTrialsError(null);
    setPaymentsError(null);

    const [statsResult, leadsResult, trialsResult, paymentsResult] = await Promise.allSettled([
      api.get<DashboardStats>('/api/dashboard/stats'),
      api.get<{ leads: RecentLead[] }>('/api/dashboard/recent-leads'),
      api.get<{ trials: UpcomingTrial[] }>('/api/dashboard/upcoming-trials'),
      api.get<{ payments: PendingPayment[] }>('/api/dashboard/pending-payments'),
    ]);

    // Stats
    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value);
    }
    setStatsLoading(false);

    // Leads
    if (leadsResult.status === 'fulfilled') {
      setLeads(leadsResult.value.leads);
    } else {
      setLeadsError('Failed to load recent leads');
    }
    setLeadsLoading(false);

    // Trials
    if (trialsResult.status === 'fulfilled') {
      setTrials(trialsResult.value.trials);
    } else {
      setTrialsError('Failed to load upcoming trials');
    }
    setTrialsLoading(false);

    // Payments
    if (paymentsResult.status === 'fulfilled') {
      setPayments(paymentsResult.value.payments);
    } else {
      setPaymentsError('Failed to load pending payments');
    }
    setPaymentsLoading(false);
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const globalLoading = statsLoading && leadsLoading && trialsLoading && paymentsLoading;

  if (globalLoading) {
    return (
      <Box>
        <Heading size="lg" mb="6">Dashboard</Heading>
        <LoadingState message="Loading dashboard..." />
      </Box>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb="6">Dashboard</Heading>

      {/* Metric Cards */}
      <SimpleGrid columns={{ base: 2, lg: 4 }} gap="5" mb="8">
        <MetricCard
          icon={<Users size={20} color="#3182ce" />}
          label="Total Leads This Month"
          value={stats ? String(stats.totalLeadsThisMonth) : '-'}
          borderColor="blue.500"
        />
        <MetricCard
          icon={<ClipboardCheck size={20} color="#38a169" />}
          label="Active Enrollments"
          value={stats ? String(stats.activeEnrollments) : '-'}
          borderColor="green.500"
        />
        <MetricCard
          icon={<DollarSign size={20} color="#805ad5" />}
          label="Total Revenue"
          value={stats ? currencyFmt.format(stats.totalRevenue) : '-'}
          borderColor="purple.500"
        />
        <MetricCard
          icon={<CreditCard size={20} color="#dd6b20" />}
          label="Pending Payments"
          value={stats ? String(stats.pendingPayments) : '-'}
          borderColor="orange.500"
        />
      </SimpleGrid>

      {/* Widget Sections */}
      <SimpleGrid columns={{ base: 1, xl: 3 }} gap="6">
        {/* Recent Leads */}
        <WidgetBox title="Recent Leads" viewAllHref="/admin/leads">
          {leadsLoading ? (
            <LoadingState message="Loading leads..." />
          ) : leadsError ? (
            <WidgetError message={leadsError} onRetry={() => void fetchAll()} />
          ) : leads.length === 0 ? (
            <Text fontSize="sm" color="gray.400" py="6" textAlign="center">
              No recent leads
            </Text>
          ) : (
            <Box overflowX="auto">
              <Box as="table" w="100%" fontSize="sm">
                <Box as="thead">
                  <Box as="tr">
                    <Box as="th" textAlign="left" py="2" pr="3" fontWeight="600" color="gray.600">Name</Box>
                    <Box as="th" textAlign="left" py="2" pr="3" fontWeight="600" color="gray.600">Email</Box>
                    <Box as="th" textAlign="left" py="2" pr="3" fontWeight="600" color="gray.600">Status</Box>
                    <Box as="th" textAlign="left" py="2" fontWeight="600" color="gray.600">Date</Box>
                  </Box>
                </Box>
                <Box as="tbody">
                  {leads.map((lead) => (
                    <Box
                      as="tr"
                      key={lead.leadId}
                      cursor="pointer"
                      _hover={{ bg: 'gray.50' }}
                      onClick={() => router.push(`/admin/leads/${lead.leadId}`)}
                    >
                      <Box as="td" py="2" pr="3" fontWeight="500">{lead.parentName}</Box>
                      <Box as="td" py="2" pr="3" color="gray.600">{lead.email}</Box>
                      <Box as="td" py="2" pr="3">
                        <Badge colorPalette={STATUS_COLORS[lead.status] ?? 'gray'}>
                          {lead.status}
                        </Badge>
                      </Box>
                      <Box as="td" py="2" whiteSpace="nowrap" color="gray.600">
                        {formatDate(lead.createdAt)}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </WidgetBox>

        {/* Upcoming Trials */}
        <WidgetBox title="Upcoming Trials" viewAllHref="/admin/enrollments">
          {trialsLoading ? (
            <LoadingState message="Loading trials..." />
          ) : trialsError ? (
            <WidgetError message={trialsError} onRetry={() => void fetchAll()} />
          ) : trials.length === 0 ? (
            <Text fontSize="sm" color="gray.400" py="6" textAlign="center">
              No upcoming trials
            </Text>
          ) : (
            <Box overflowX="auto">
              <Box as="table" w="100%" fontSize="sm">
                <Box as="thead">
                  <Box as="tr">
                    <Box as="th" textAlign="left" py="2" pr="3" fontWeight="600" color="gray.600">Parent</Box>
                    <Box as="th" textAlign="left" py="2" pr="3" fontWeight="600" color="gray.600">Child</Box>
                    <Box as="th" textAlign="left" py="2" pr="3" fontWeight="600" color="gray.600">Program</Box>
                    <Box as="th" textAlign="left" py="2" fontWeight="600" color="gray.600">Trial Date</Box>
                  </Box>
                </Box>
                <Box as="tbody">
                  {trials.map((trial) => (
                    <Box as="tr" key={trial.trialId} _hover={{ bg: 'gray.50' }}>
                      <Box as="td" py="2" pr="3" fontWeight="500">{trial.parentName}</Box>
                      <Box as="td" py="2" pr="3" color="gray.600">{trial.childName}</Box>
                      <Box as="td" py="2" pr="3" color="gray.600">{trial.programName}</Box>
                      <Box as="td" py="2" whiteSpace="nowrap" color="gray.600">
                        {formatDate(trial.trialDate)}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </WidgetBox>

        {/* Pending Payments */}
        <WidgetBox title="Pending Payments" viewAllHref="/admin/payments">
          {paymentsLoading ? (
            <LoadingState message="Loading payments..." />
          ) : paymentsError ? (
            <WidgetError message={paymentsError} onRetry={() => void fetchAll()} />
          ) : payments.length === 0 ? (
            <Text fontSize="sm" color="gray.400" py="6" textAlign="center">
              No pending payments
            </Text>
          ) : (
            <Box overflowX="auto">
              <Box as="table" w="100%" fontSize="sm">
                <Box as="thead">
                  <Box as="tr">
                    <Box as="th" textAlign="left" py="2" pr="3" fontWeight="600" color="gray.600">Parent</Box>
                    <Box as="th" textAlign="left" py="2" pr="3" fontWeight="600" color="gray.600">Program</Box>
                    <Box as="th" textAlign="right" py="2" pr="3" fontWeight="600" color="gray.600">Amount</Box>
                    <Box as="th" textAlign="left" py="2" fontWeight="600" color="gray.600">Status</Box>
                  </Box>
                </Box>
                <Box as="tbody">
                  {payments.map((p) => (
                    <Box
                      as="tr"
                      key={p.paymentId}
                      cursor="pointer"
                      _hover={{ bg: 'gray.50' }}
                      onClick={() => router.push(`/admin/payments/${p.paymentId}`)}
                    >
                      <Box as="td" py="2" pr="3" fontWeight="500">{p.parentName}</Box>
                      <Box as="td" py="2" pr="3" color="gray.600">{p.programName}</Box>
                      <Box as="td" py="2" pr="3" textAlign="right" fontWeight="500">
                        {currencyFmt.format(p.amountDue)}
                      </Box>
                      <Box as="td" py="2">
                        <Badge colorPalette={STATUS_COLORS[p.status] ?? 'gray'}>
                          {p.status}
                        </Badge>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </WidgetBox>
      </SimpleGrid>
    </Box>
  );
}
