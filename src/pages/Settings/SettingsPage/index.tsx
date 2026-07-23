import React, { ReactNode, useState } from 'react';
import { Group, Stack, Tabs, Title } from '@mantine/core';
import { IconBuilding, IconSettings, IconUser } from '@tabler/icons-react';
import User from '../../../models/user/user';
import AccountPage from '../AccountPage';
import MyOrganizationPage from '../MyOrganizationPage';

export interface SettingsPageProps {
  /**
   * The current user, with `roles` + `organization_managers.organization`
   * expanded (fetch via `AuthRequests.getMeWithOrganizations`). Injected by the
   * consumer so this page stays decoupled from the Redux-coupled MeContext.
   */
  me: Pick<User, 'id' | 'email' | 'organization_managers'>;
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
 * Drop-in Settings composition: Account (change password) + My organization,
 * as Mantine tabs. Mount one component and pass the injected `me`.
 *
 * The super-admin "All organizations" management surface is NOT part of
 * Settings — it lives in the standalone `OrganizationsPage` component, which
 * consumers mount as a top-level (super-admin-gated) nav page.
 *
 * Exported both as `SettingsPage` and `SettingsLayout`.
 */
const SettingsPage: React.FC<SettingsPageProps> = ({ me, title = 'Settings', headerIcon }) => {
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
        </Tabs.List>

        <Tabs.Panel value="account" pt="md">
          <AccountPage me={me} />
        </Tabs.Panel>
        <Tabs.Panel value="organization" pt="md">
          <MyOrganizationPage me={me} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default SettingsPage;
