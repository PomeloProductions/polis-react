import React, { ReactNode, useState } from 'react';
import { Group, Stack, Tabs, Title } from '@mantine/core';
import { IconBuilding, IconSettings, IconShieldLock, IconUser } from '@tabler/icons-react';
import User from '../../../models/user/user';
import AccountPage from '../AccountPage';
import MyOrganizationPage from '../MyOrganizationPage';
import OrganizationsAdminPage from '../OrganizationsAdminPage';

export interface SettingsPageProps {
  /**
   * The current user, with `roles` + `organization_managers.organization`
   * expanded (fetch via `AuthRequests.getMeWithOrganizations`). Injected by the
   * consumer so this page stays decoupled from the Redux-coupled MeContext.
   */
  me: Pick<User, 'id' | 'email' | 'organization_managers'>;
  /**
   * Whether to render the super-admin "Organizations" tab. The GATING decision
   * is the consumer's — e.g. pass `isSuperAdmin(me)`. Defaults to `false`.
   */
  showOrganizationsAdmin?: boolean;
  /**
   * Page heading. Defaults to "Settings".
   */
  title?: string;
  /**
   * Optional node rendered to the left of the heading (e.g. an icon/logo).
   * Defaults to a settings icon.
   */
  headerIcon?: ReactNode;
}

/**
 * Drop-in Settings composition: Account (change password) + My organization +
 * (optional) super-admin Organizations, as Mantine tabs. Mount one component
 * and pass the injected `me`. The super-admin tab is shown only when the
 * consumer passes `showOrganizationsAdmin` (the gating decision is theirs — the
 * backend enforces its own gate on `GET /v1/organizations`).
 *
 * Exported both as `SettingsPage` and `SettingsLayout`.
 */
const SettingsPage: React.FC<SettingsPageProps> = ({
  me,
  showOrganizationsAdmin = false,
  title = 'Settings',
  headerIcon,
}) => {
  const [tab, setTab] = useState<string | null>('account');

  return (
    <Stack gap="lg">
      <Group gap="xs">
        {headerIcon ?? <IconSettings size={26} />}
        <Title order={1}>{title}</Title>
      </Group>

      <Tabs value={tab} onChange={setTab}>
        <Tabs.List>
          <Tabs.Tab value="account" leftSection={<IconUser size={16} />}>
            Account
          </Tabs.Tab>
          <Tabs.Tab value="organization" leftSection={<IconBuilding size={16} />}>
            My organization
          </Tabs.Tab>
          {showOrganizationsAdmin && (
            <Tabs.Tab value="organizations" leftSection={<IconShieldLock size={16} />}>
              Organizations
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="account" pt="md">
          <AccountPage me={me} />
        </Tabs.Panel>
        <Tabs.Panel value="organization" pt="md">
          <MyOrganizationPage me={me} />
        </Tabs.Panel>
        {showOrganizationsAdmin && (
          <Tabs.Panel value="organizations" pt="md">
            <OrganizationsAdminPage />
          </Tabs.Panel>
        )}
      </Tabs>
    </Stack>
  );
};

export default SettingsPage;
