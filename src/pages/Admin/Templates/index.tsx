import React, { useCallback, useState } from 'react';
import { Container, Stack, Tabs, Title } from '@mantine/core';
import TemplateList from '../../../components/Templates/TemplateList';
import TemplateEditor, { PreviewVariables } from '../../../components/Templates/TemplateEditor';
import type { EmailTemplateClient, PushTemplateClient } from '../../../models/messaging-template';

export interface AdminTemplatesPageProps {
  /** Organization being administered. */
  organizationId: number;
  /** Client used to talk to the email-template admin endpoints. */
  emailClient: EmailTemplateClient;
  /** Client used to talk to the push-template admin endpoints. */
  pushClient: PushTemplateClient;
  /** Optional sample variables for the editor's live preview. */
  previewVariables?: PreviewVariables;
  /**
   * Optional tab default — useful when the page is linked to from a
   * specific channel's settings.
   */
  initialTab?: 'email' | 'push';
}

/**
 * Page composer for the email + push template admin surface. Tabs
 * switch between channels; each tab renders its TemplateList, and
 * clicking Edit on a row opens the matching TemplateEditor drawer.
 *
 * This page is intentionally provider-agnostic: it relies on the
 * consumer's MantineProvider being mounted higher in the tree (the
 * polis-react PolisProvider does this, but a bare MantineProvider is
 * also fine).
 */
const AdminTemplatesPage: React.FC<AdminTemplatesPageProps> = ({
  organizationId,
  emailClient,
  pushClient,
  previewVariables,
  initialTab = 'email',
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'push'>(initialTab);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  // Bumped after a save/revert so the list refetches.
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  const handleClose = useCallback(() => setEditingKey(null), []);
  const handleSaved = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Title order={1}>Message templates</Title>

        <Tabs
          value={activeTab}
          onChange={(value) => {
            if (value === 'email' || value === 'push') setActiveTab(value);
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="email">Email</Tabs.Tab>
            <Tabs.Tab value="push">Push</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="email" pt="md">
            <TemplateList
              // Force refetch when a save bumps the nonce.
              key={`email-${refreshNonce}`}
              type="email"
              organizationId={organizationId}
              client={emailClient}
              onEdit={(key) => setEditingKey(key)}
            />
          </Tabs.Panel>

          <Tabs.Panel value="push" pt="md">
            <TemplateList
              key={`push-${refreshNonce}`}
              type="push"
              organizationId={organizationId}
              client={pushClient}
              onEdit={(key) => setEditingKey(key)}
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {activeTab === 'email' ? (
        <TemplateEditor
          type="email"
          organizationId={organizationId}
          client={emailClient}
          templateKey={editingKey}
          onClose={handleClose}
          onSaved={handleSaved}
          previewVariables={previewVariables}
        />
      ) : (
        <TemplateEditor
          type="push"
          organizationId={organizationId}
          client={pushClient}
          templateKey={editingKey}
          onClose={handleClose}
          onSaved={handleSaved}
          previewVariables={previewVariables}
        />
      )}
    </Container>
  );
};

export default AdminTemplatesPage;
