import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Card, Group, Loader, Stack, Table, Tabs, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBuilding, IconFileText, IconReceipt, IconUsers } from '@tabler/icons-react';
import OrganizationRequests, {
  InviteOrganizationManagerPayload,
} from '../../services/requests/OrganizationRequests';
import Organization from '../../models/organization/organization';
import OrganizationManager from '../../models/organization/organization-manager';
import OrganizationArticle from '../../models/organization/organization-article';
import OrganizationPayment from '../../models/organization/organization-payment';
import Page from '../../models/page';
import User, { canInviteMembers } from '../../models/user/user';
import { getRoleName } from '../../models/role';
import InviteMemberForm from '../../components/Forms/InviteMemberForm';

/**
 * An extra, app-specific tab injected by a consumer (e.g. client-driver's
 * "Services" tab). Rendered after the built-in Users / Contracts / Invoices
 * tabs.
 */
export interface OrganizationDetailExtraTab {
  /**
   * Stable Tabs value (also used as the React key).
   */
  value: string;
  /**
   * The tab label.
   */
  label: string;
  /**
   * Optional left-section icon for the tab.
   */
  icon?: ReactNode;
  /**
   * The panel content. Receives the resolved organization id so the consumer
   * can fetch its own data.
   */
  render: (organizationId: number) => ReactNode;
}

export interface OrganizationDetailPageProps {
  /**
   * The organization id to show. Resolve from a route param in the consumer.
   */
  organizationId: number;
  /**
   * The current user, with `roles` + `organization_managers` expanded (fetch
   * via `AuthRequests.getMeWithOrganizations`). Injected by the consumer so the
   * page stays decoupled from the Redux-coupled MeContext. Used to gate the
   * invite affordance (super admins + org ADMINISTRATORs only). When omitted,
   * the invite form is hidden.
   */
  me?: Pick<User, 'roles' | 'organization_managers'> | null;
  /**
   * Extra app-specific tabs (e.g. "Services") appended after the built-ins.
   */
  extraTabs?: OrganizationDetailExtraTab[];
  /**
   * Override the org fetch. Defaults to `OrganizationRequests.getOrganization`.
   */
  onFetchOrganization?: (orgId: number) => Promise<Organization>;
  /**
   * Override the members fetch. Defaults to
   * `OrganizationRequests.listOrganizationManagers`.
   */
  onListMembers?: (orgId: number) => Promise<Page<OrganizationManager>>;
  /**
   * Override the invite call. Defaults to
   * `OrganizationRequests.inviteOrganizationManager`.
   */
  onInviteMember?: (
    orgId: number,
    payload: InviteOrganizationManagerPayload,
  ) => Promise<OrganizationManager>;
  /**
   * Override the contracts (articles) fetch. Defaults to
   * `OrganizationRequests.listOrganizationArticles`.
   */
  onListArticles?: (orgId: number) => Promise<Page<OrganizationArticle>>;
  /**
   * Override the invoices (payments) fetch. Defaults to
   * `OrganizationRequests.listOrganizationPayments`.
   */
  onListPayments?: (orgId: number) => Promise<Page<OrganizationPayment>>;
}

const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString() : '';

const formatAmount = (payment: OrganizationPayment): string => {
  if (payment.amount == null) return '';
  const currency = (payment.currency ?? 'usd').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(payment.amount);
  } catch {
    return `${payment.amount} ${currency}`;
  }
};

interface MembersTabProps {
  organizationId: number;
  canInvite: boolean;
  onListMembers: (orgId: number) => Promise<Page<OrganizationManager>>;
  onInviteMember: (
    orgId: number,
    payload: InviteOrganizationManagerPayload,
  ) => Promise<OrganizationManager>;
}

const MembersTab: React.FC<MembersTabProps> = ({
  organizationId,
  canInvite,
  onListMembers,
  onInviteMember,
}) => {
  const [members, setMembers] = useState<OrganizationManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await onListMembers(organizationId);
      setMembers(res.data ?? []);
    } catch {
      setError('Could not load members.');
    } finally {
      setLoading(false);
    }
  }, [onListMembers, organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Stack>
      {error && <Alert color="red">{error}</Alert>}

      {loading ? (
        <Loader />
      ) : members.length === 0 ? (
        <Text size="sm" c="dimmed">
          No members yet.
        </Text>
      ) : (
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {members.map((member) => (
              <Table.Tr key={member.id}>
                <Table.Td>{member.user?.full_name ?? member.user?.name ?? '—'}</Table.Td>
                <Table.Td>{member.contact_email ?? member.user?.email ?? '—'}</Table.Td>
                <Table.Td>
                  <Badge variant="light">{getRoleName(member.role_id)}</Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {canInvite && (
        <Card withBorder radius="md" p="md" maw={520}>
          <Stack gap="sm">
            <Title order={5}>Invite a member</Title>
            <InviteMemberForm
              onSubmit={async (values) => {
                await onInviteMember(organizationId, values);
              }}
              onSuccess={() => {
                notifications.show({
                  color: 'green',
                  title: 'Invitation sent',
                  message: 'The invitation email is on its way.',
                });
                load();
              }}
            />
          </Stack>
        </Card>
      )}
    </Stack>
  );
};

interface ArticlesTabProps {
  organizationId: number;
  onListArticles: (orgId: number) => Promise<Page<OrganizationArticle>>;
}

const ContractsTab: React.FC<ArticlesTabProps> = ({ organizationId, onListArticles }) => {
  const [articles, setArticles] = useState<OrganizationArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    onListArticles(organizationId)
      .then((res) => {
        if (!cancelled) setArticles(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load contracts.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onListArticles, organizationId]);

  if (loading) return <Loader />;
  if (error) return <Alert color="red">{error}</Alert>;
  if (articles.length === 0)
    return (
      <Text size="sm" c="dimmed">
        No contracts yet.
      </Text>
    );

  return (
    <Table verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Title</Table.Th>
          <Table.Th>Description</Table.Th>
          <Table.Th>Updated</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {articles.map((article) => (
          <Table.Tr key={article.id}>
            <Table.Td>{article.title}</Table.Td>
            <Table.Td>{article.description ?? '—'}</Table.Td>
            <Table.Td>{formatDate(article.updated_at)}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};

interface PaymentsTabProps {
  organizationId: number;
  onListPayments: (orgId: number) => Promise<Page<OrganizationPayment>>;
}

const InvoicesTab: React.FC<PaymentsTabProps> = ({ organizationId, onListPayments }) => {
  const [payments, setPayments] = useState<OrganizationPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    onListPayments(organizationId)
      .then((res) => {
        if (!cancelled) setPayments(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load invoices.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onListPayments, organizationId]);

  if (loading) return <Loader />;
  if (error) return <Alert color="red">{error}</Alert>;
  if (payments.length === 0)
    return (
      <Text size="sm" c="dimmed">
        No invoices yet.
      </Text>
    );

  return (
    <Table verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Description</Table.Th>
          <Table.Th>Amount</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Date</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {payments.map((payment) => (
          <Table.Tr key={payment.id}>
            <Table.Td>{payment.description ?? '—'}</Table.Td>
            <Table.Td>{formatAmount(payment)}</Table.Td>
            <Table.Td>
              {payment.status ? <Badge variant="light">{payment.status}</Badge> : '—'}
            </Table.Td>
            <Table.Td>{formatDate(payment.paid_at ?? payment.created_at)}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};

/**
 * Organization detail page: a tabbed view of a single organization's Users
 * (members), Contracts (articles) and Invoices (payments). Consumers may inject
 * extra app-specific tabs via `extraTabs` (e.g. client-driver's "Services").
 *
 * Scoping is the consumer's responsibility (super admins see any org;
 * admins/managers only theirs) — mount this only for orgs the user may view.
 * The invite affordance inside the Users tab is additionally role-gated here
 * via `canInviteMembers(me, organizationId)`.
 *
 * Behavior is injected via `on*` props (defaulting to `OrganizationRequests`),
 * keeping the page decoupled from Redux/API wiring like the other pages.
 */
const OrganizationDetailPage: React.FC<OrganizationDetailPageProps> = ({
  organizationId,
  me,
  extraTabs = [],
  onFetchOrganization,
  onListMembers,
  onInviteMember,
  onListArticles,
  onListPayments,
}) => {
  const fetchOrg = onFetchOrganization ?? OrganizationRequests.getOrganization;
  const listMembers = onListMembers ?? OrganizationRequests.listOrganizationManagers;
  const inviteMember = onInviteMember ?? OrganizationRequests.inviteOrganizationManager;
  const listArticles = onListArticles ?? OrganizationRequests.listOrganizationArticles;
  const listPayments = onListPayments ?? OrganizationRequests.listOrganizationPayments;

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<string | null>('members');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchOrg(organizationId)
      .then((o) => {
        if (!cancelled) setOrg(o);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load this organization.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchOrg, organizationId]);

  const canInvite = canInviteMembers(me, organizationId);

  return (
    <Card withBorder radius="md" p="lg">
      <Stack>
        <Group gap="xs">
          <IconBuilding size={26} />
          <Title order={2}>{org?.name ?? 'Organization'}</Title>
        </Group>

        {loadError && <Alert color="red">{loadError}</Alert>}

        {loading ? (
          <Loader />
        ) : (
          <Tabs value={tab} onChange={setTab}>
            <Tabs.List>
              <Tabs.Tab value="members" leftSection={<IconUsers size={16} />}>
                Users
              </Tabs.Tab>
              <Tabs.Tab value="contracts" leftSection={<IconFileText size={16} />}>
                Contracts
              </Tabs.Tab>
              <Tabs.Tab value="invoices" leftSection={<IconReceipt size={16} />}>
                Invoices
              </Tabs.Tab>
              {extraTabs.map((extra) => (
                <Tabs.Tab key={extra.value} value={extra.value} leftSection={extra.icon}>
                  {extra.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <Tabs.Panel value="members" pt="md">
              <MembersTab
                organizationId={organizationId}
                canInvite={canInvite}
                onListMembers={listMembers}
                onInviteMember={inviteMember}
              />
            </Tabs.Panel>
            <Tabs.Panel value="contracts" pt="md">
              <ContractsTab organizationId={organizationId} onListArticles={listArticles} />
            </Tabs.Panel>
            <Tabs.Panel value="invoices" pt="md">
              <InvoicesTab organizationId={organizationId} onListPayments={listPayments} />
            </Tabs.Panel>
            {extraTabs.map((extra) => (
              <Tabs.Panel key={extra.value} value={extra.value} pt="md">
                {extra.render(organizationId)}
              </Tabs.Panel>
            ))}
          </Tabs>
        )}
      </Stack>
    </Card>
  );
};

export default OrganizationDetailPage;
