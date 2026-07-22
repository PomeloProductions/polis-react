import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Group, Loader, Stack, Table, Text, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import OrganizationRequests, {
  ListOrganizationsParams,
  OrganizationPayload,
} from '../../services/requests/OrganizationRequests';
import Organization from '../../models/organization/organization';
import Page from '../../models/page';
import OrganizationModal from './OrganizationModal';

export interface OrganizationsPageProps {
  /**
   * Override the list call. Defaults to `OrganizationRequests.listOrganizations`.
   */
  onListOrganizations?: (params: ListOrganizationsParams) => Promise<Page<Organization>>;
  /**
   * Override the create call. Defaults to `OrganizationRequests.createOrganization`.
   */
  onCreateOrganization?: (payload: OrganizationPayload) => Promise<Organization>;
  /**
   * Override the update call. Defaults to `OrganizationRequests.updateOrganization`.
   */
  onUpdateOrganization?: (orgId: number, payload: OrganizationPayload) => Promise<Organization>;
  /**
   * Page size for the org list. Defaults to 50.
   */
  pageSize?: number;
  /**
   * Section heading. Defaults to "All organizations".
   */
  title?: string;
}

const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString() : '';

/**
 * Super-admin-only page: manage ALL organizations (list / view-edit / create).
 * Lists every org via `GET /v1/organizations` (super-admin-authorized on the
 * backend). This component does NOT gate itself — the consumer decides whether
 * to render it (e.g. `isSuperAdmin(me) && <OrganizationsPage />`), and mounts it
 * as a top-level (super-admin-gated) nav page rather than a Settings tab.
 */
const OrganizationsPage: React.FC<OrganizationsPageProps> = ({
  onListOrganizations,
  onCreateOrganization,
  onUpdateOrganization,
  pageSize = 50,
  title = 'All organizations',
}) => {
  const listOrgs = onListOrganizations ?? OrganizationRequests.listOrganizations;
  const createOrg = onCreateOrganization ?? OrganizationRequests.createOrganization;
  const updateOrg = onUpdateOrganization ?? OrganizationRequests.updateOrganization;

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listOrgs({ limit: pageSize, page: 1 });
      setOrgs(res.data ?? []);
      setTotal(res.total ?? (res.data ?? []).length);
    } catch {
      setError('Could not load organizations.');
    } finally {
      setLoading(false);
    }
  }, [listOrgs, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (org: Organization) => {
    setEditing(org);
    setModalOpen(true);
  };

  return (
    <Card withBorder radius="md" p="lg">
      <Stack>
        <Group justify="space-between">
          <Title order={3}>{title}</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            New organization
          </Button>
        </Group>

        {error && <Alert color="red">{error}</Alert>}

        {loading ? (
          <Loader />
        ) : orgs.length === 0 ? (
          <Text size="sm" c="dimmed">
            No organizations yet.
          </Text>
        ) : (
          <>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {orgs.map((org) => (
                  <Table.Tr key={org.id}>
                    <Table.Td>{org.id}</Table.Td>
                    <Table.Td>{org.name}</Table.Td>
                    <Table.Td>{formatDate(org.created_at)}</Table.Td>
                    <Table.Td>
                      <Button size="xs" variant="subtle" onClick={() => openEdit(org)}>
                        Edit
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {total > orgs.length && (
              <Text size="xs" c="dimmed">
                Showing {orgs.length} of {total} organizations.
              </Text>
            )}
          </>
        )}
      </Stack>

      <OrganizationModal
        opened={modalOpen}
        org={editing}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        onCreate={createOrg}
        onUpdate={updateOrg}
      />
    </Card>
  );
};

export default OrganizationsPage;
