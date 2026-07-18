import React from 'react';
import { Card, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import ChangePasswordForm from '../../../components/Forms/ChangePasswordForm';
import AuthRequests from '../../../services/requests/AuthRequests';
import User from '../../../models/user/user';

export interface AccountPageProps {
  /**
   * The current user. Injected by the consumer (e.g. from their MeContext) so
   * this page stays decoupled from the Redux-coupled MeContext.
   */
  me: Pick<User, 'id' | 'email'>;
  /**
   * Override the password update call. Defaults to
   * `AuthRequests.updatePassword(me.id, password)` — the shared HTTP layer,
   * not Redux.
   */
  onUpdatePassword?: (userId: number, password: string) => Promise<void>;
  /**
   * Minimum password length. Defaults to 6 (Athenia rule).
   */
  minLength?: number;
  /**
   * Section heading. Defaults to "Change password".
   */
  title?: string;
}

/**
 * Default account-settings composition: wraps `<ChangePasswordForm />` in a
 * Mantine `<Card>` and wires it to `AuthRequests.updatePassword`. Consumers can
 * mount as-is or copy-and-customize. Alias exported as `AccountSettings`.
 */
const AccountPage: React.FC<AccountPageProps> = ({
  me,
  onUpdatePassword,
  minLength = 6,
  title = 'Change password',
}) => {
  const handleSubmit = async (password: string) => {
    if (me.id == null) return;
    if (onUpdatePassword) {
      await onUpdatePassword(me.id, password);
    } else {
      await AuthRequests.updatePassword(me.id, password);
    }
  };

  return (
    <Card withBorder radius="md" p="lg" maw={520}>
      <Stack>
        <Title order={3}>{title}</Title>
        {me.email && (
          <Text size="sm" c="dimmed">
            Signed in as {me.email}.
          </Text>
        )}
        <ChangePasswordForm
          onSubmit={handleSubmit}
          minLength={minLength}
          onSuccess={() =>
            notifications.show({
              color: 'green',
              title: 'Password updated',
              message: 'Your password has been changed.',
            })
          }
        />
      </Stack>
    </Card>
  );
};

export default AccountPage;
