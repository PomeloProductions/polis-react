import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Loader, Select, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import OrganizationForm from '../../../components/Forms/OrganizationForm';
import OrganizationRequests, {
  OrganizationPayload,
} from '../../../services/requests/OrganizationRequests';
import Organization from '../../../models/organization/organization';
import User from '../../../models/user/user';

export interface MyOrganizationPageProps {
  /**
   * The current user, with `organization_managers.organization` expanded
   * (fetch via `AuthRequests.getMeWithOrganizations`). Injected by the consumer
   * so the page stays decoupled from the Redux-coupled MeContext.
   */
  me: Pick<User, 'organization_managers'>;
  /**
   * Override the single-org fetch. Defaults to
   * `OrganizationRequests.getOrganization`.
   */
  onFetchOrganization?: (orgId: number) => Promise<Organization>;
  /**
   * Override the org update. Defaults to `OrganizationRequests.updateOrganization`.
   */
  onUpdateOrganization?: (orgId: number, payload: OrganizationPayload) => Promise<Organization>;
  /**
   * Section heading. Defaults to "My organization".
   */
  title?: string;
}

interface EditorProps {
  orgId: number;
  onFetchOrganization: (orgId: number) => Promise<Organization>;
  onUpdateOrganization: (orgId: number, payload: OrganizationPayload) => Promise<Organization>;
}

const OrganizationEditor: React.FC<EditorProps> = ({
  orgId,
  onFetchOrganization,
  onUpdateOrganization,
}) => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    onFetchOrganization(orgId)
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
  }, [orgId, onFetchOrganization]);

  if (loading) return <Loader />;
  if (loadError) return <Alert color="red">{loadError}</Alert>;
  if (!org) return null;

  return (
    <OrganizationForm
      initialValues={{ name: org.name ?? '' }}
      submitLabel="Save changes"
      onSubmit={async (values) => {
        const updated = await onUpdateOrganization(orgId, { name: values.name });
        setOrg(updated);
      }}
      onSuccess={() =>
        notifications.show({
          color: 'green',
          title: 'Organization updated',
          message: 'Saved your changes.',
        })
      }
    />
  );
};

/**
 * "My organization" settings: view + edit the organization(s) the current user
 * manages, resolved from the expanded `organization_managers.organization` on
 * the injected `me`. Renders a picker when the user manages more than one org.
 * Alias exported as `OrganizationSettings`.
 */
const MyOrganizationPage: React.FC<MyOrganizationPageProps> = ({
  me,
  onFetchOrganization,
  onUpdateOrganization,
  title = 'My organization',
}) => {
  const fetchOrg = onFetchOrganization ?? OrganizationRequests.getOrganization;
  const updateOrg = onUpdateOrganization ?? OrganizationRequests.updateOrganization;

  const managedOrgs = useMemo(() => {
    const seen = new Map<number, { id: number; name: string }>();
    for (const m of me.organization_managers ?? []) {
      const o = m.organization;
      if (o && o.id != null && !seen.has(o.id)) {
        seen.set(o.id, { id: o.id, name: o.name });
      }
    }
    return Array.from(seen.values());
  }, [me.organization_managers]);

  const [selectedId, setSelectedId] = useState<number | null>(
    managedOrgs.length > 0 ? managedOrgs[0].id : null,
  );

  if (managedOrgs.length === 0) {
    return (
      <Card withBorder radius="md" p="lg" maw={520}>
        <Text size="sm" c="dimmed">
          You don&apos;t manage any organizations.
        </Text>
      </Card>
    );
  }

  return (
    <Card withBorder radius="md" p="lg" maw={520}>
      <Stack>
        <Title order={3}>{title}</Title>
        {managedOrgs.length > 1 && (
          <Select
            label="Organization"
            data={managedOrgs.map((o) => ({ value: String(o.id), label: o.name }))}
            value={selectedId != null ? String(selectedId) : null}
            onChange={(v) => setSelectedId(v ? Number(v) : null)}
            allowDeselect={false}
          />
        )}
        {selectedId != null && (
          <OrganizationEditor
            key={selectedId}
            orgId={selectedId}
            onFetchOrganization={fetchOrg}
            onUpdateOrganization={updateOrg}
          />
        )}
      </Stack>
    </Card>
  );
};

export default MyOrganizationPage;
