import React, { ReactNode, useState } from 'react';
import { Card, Group, SegmentedControl, Stack, Tabs, Text, Title } from '@mantine/core';
import { IconBuilding, IconPalette, IconSettings, IconUser } from '@tabler/icons-react';
import User from '../../../models/user/user';
import AccountPage from '../AccountPage';
import MyOrganizationPage from '../MyOrganizationPage';
import { useColorScheme } from '../../../theme/colorScheme';
import type { PolisColorScheme } from '../../../theme/colorScheme';

export interface ExtraTab {
  value: string;
  label: string;
  icon?: ReactNode;
  panel: ReactNode;
}

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
  /**
   * Whether to show the "My organization" tab. Defaults to `true`.
   * Set to `false` for apps that don't use the organization feature.
   */
  showOrganizationTab?: boolean;
  /**
   * Additional app-specific tabs rendered after the built-in tabs.
   */
  extraTabs?: ExtraTab[];
}

const colorSchemeOptions: { value: PolisColorScheme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const AppearanceTab: React.FC = () => {
  const { colorScheme, setColorScheme } = useColorScheme();

  return (
    <Card withBorder radius="md" p="lg" maw={520}>
      <Stack>
        <Title order={3}>Color scheme</Title>
        <Text size="sm" c="dimmed">
          Choose how the app looks. "System" follows your OS setting automatically.
        </Text>
        <SegmentedControl
          value={colorScheme}
          onChange={(v) => setColorScheme(v as PolisColorScheme)}
          data={colorSchemeOptions}
          style={{ maxWidth: 280 }}
        />
      </Stack>
    </Card>
  );
};

/**
 * Drop-in Settings composition: Account (change password) + Appearance (color
 * scheme) + My organization, as Mantine tabs. Mount one component and pass the
 * injected `me`. Additional app-specific tabs can be passed via `extraTabs`.
 *
 * Exported both as `SettingsPage` and `SettingsLayout`.
 */
const SettingsPage: React.FC<SettingsPageProps> = ({
  me,
  title = 'Settings',
  headerIcon,
  showOrganizationTab = true,
  extraTabs = [],
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
          <Tabs.Tab value="appearance" leftSection={<IconPalette size={16} />}>
            Appearance
          </Tabs.Tab>
          {showOrganizationTab && (
            <Tabs.Tab value="organization" leftSection={<IconBuilding size={16} />}>
              My organization
            </Tabs.Tab>
          )}
          {extraTabs.map((t) => (
            <Tabs.Tab key={t.value} value={t.value} leftSection={t.icon}>
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel value="account" pt="md">
          <AccountPage me={me} />
        </Tabs.Panel>
        <Tabs.Panel value="appearance" pt="md">
          <AppearanceTab />
        </Tabs.Panel>
        {showOrganizationTab && (
          <Tabs.Panel value="organization" pt="md">
            <MyOrganizationPage me={me} />
          </Tabs.Panel>
        )}
        {extraTabs.map((t) => (
          <Tabs.Panel key={t.value} value={t.value} pt="md">
            {t.panel}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  );
};

export default SettingsPage;
