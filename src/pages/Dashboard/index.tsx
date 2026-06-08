import React, { ReactNode } from 'react';
import { Center, Container, Paper, Stack, Text, Title } from '@mantine/core';
import MeContextProvider, { MeContext } from '../../contexts/MeContext';
import { AuthPageBranding } from '../Auth/SignInPage';

export interface DashboardPageProps {
  branding?: AuthPageBranding;
  /**
   * Optional content rendered inside the dashboard card. Consumers
   * will almost always override this — the default is a "you're
   * signed in" stub.
   */
  children?: ReactNode;
}

/**
 * Minimal logged-in landing page. Reads the current user via
 * `MeContext` and displays a "you're signed in" stub. Consumers will
 * typically pass `children` (or copy-and-customize) for their actual
 * dashboard content.
 */
const DashboardPage: React.FC<DashboardPageProps> = ({ branding, children }) => {
  const appName = branding?.appName ?? 'Polis';

  return (
    <Container size="md" py="xl">
      <Center mb="lg">{branding?.logo}</Center>
      <MeContextProvider>
        <MeContext.Consumer>
          {({ me, isLoggedIn }) => (
            <Paper shadow="sm" p="xl" radius="md" withBorder>
              <Stack gap="md">
                <Title order={2}>
                  {isLoggedIn && me.first_name
                    ? `Welcome back, ${me.first_name}`
                    : `Welcome to ${appName}`}
                </Title>
                {children ? (
                  children
                ) : (
                  <Text c="dimmed">
                    You're signed in. This is a placeholder dashboard — replace it in your app with
                    the content you actually want here.
                  </Text>
                )}
              </Stack>
            </Paper>
          )}
        </MeContext.Consumer>
      </MeContextProvider>
    </Container>
  );
};

export default DashboardPage;
