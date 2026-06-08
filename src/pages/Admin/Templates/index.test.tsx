import React from 'react';
import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminTemplatesPage from './index';
import type {
  EmailTemplateClient,
  EmailTemplateEntry,
  PushTemplateClient,
  PushTemplateEntry,
} from '../../../models/messaging-template';

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const emailEntry = (overrides: Partial<EmailTemplateEntry> = {}): EmailTemplateEntry => ({
  key: 'welcome',
  subject: 'Welcome!',
  body_html: '<p>Hi</p>',
  organization_id: null,
  source: 'default',
  default_subject: 'Welcome!',
  default_body_html: '<p>Hi</p>',
  ...overrides,
});

const pushEntry = (overrides: Partial<PushTemplateEntry> = {}): PushTemplateEntry => ({
  key: 'contact_created',
  title: 'New contact',
  body: 'Hello',
  organization_id: null,
  source: 'default',
  default_title: 'New contact',
  default_body: 'Hello',
  ...overrides,
});

describe('AdminTemplatesPage', () => {
  const makeClients = (
    emailEntries: EmailTemplateEntry[] = [emailEntry()],
    pushEntries: PushTemplateEntry[] = [pushEntry()],
  ): { emailClient: EmailTemplateClient; pushClient: PushTemplateClient } => ({
    emailClient: {
      list: jest.fn().mockResolvedValue(emailEntries),
      show: jest.fn().mockResolvedValue(emailEntries[0]),
      update: jest.fn().mockResolvedValue(emailEntries[0]),
      revert: jest.fn().mockResolvedValue(undefined),
    },
    pushClient: {
      list: jest.fn().mockResolvedValue(pushEntries),
      show: jest.fn().mockResolvedValue(pushEntries[0]),
      update: jest.fn().mockResolvedValue(pushEntries[0]),
      revert: jest.fn().mockResolvedValue(undefined),
    },
  });

  test('renders the email tab as the default and lists email templates', async () => {
    const { emailClient, pushClient } = makeClients();

    renderWithMantine(
      <AdminTemplatesPage organizationId={42} emailClient={emailClient} pushClient={pushClient} />,
    );

    expect(await screen.findByText('welcome')).toBeInTheDocument();
    expect(emailClient.list).toHaveBeenCalledWith(42);
  });

  test('switching to the push tab shows push templates', async () => {
    const { emailClient, pushClient } = makeClients();

    renderWithMantine(
      <AdminTemplatesPage organizationId={42} emailClient={emailClient} pushClient={pushClient} />,
    );

    await screen.findByText('welcome');
    fireEvent.click(screen.getByRole('tab', { name: /Push/i }));

    await waitFor(() => expect(pushClient.list).toHaveBeenCalledWith(42));
    expect(await screen.findByText('contact_created')).toBeInTheDocument();
  });

  test('clicking edit opens the editor drawer for the selected key', async () => {
    const { emailClient, pushClient } = makeClients();

    renderWithMantine(
      <AdminTemplatesPage organizationId={42} emailClient={emailClient} pushClient={pushClient} />,
    );

    const editButton = await screen.findByLabelText('Edit welcome');
    fireEvent.click(editButton);

    await waitFor(() => expect(emailClient.show).toHaveBeenCalledWith(42, 'welcome'));
    expect(await screen.findByText(/Edit email template/i)).toBeInTheDocument();
  });

  test('initialTab respects caller preference', async () => {
    const { emailClient, pushClient } = makeClients();

    renderWithMantine(
      <AdminTemplatesPage
        organizationId={42}
        emailClient={emailClient}
        pushClient={pushClient}
        initialTab="push"
      />,
    );

    // Push templates render with the push tab active.
    expect(await screen.findByText('contact_created')).toBeInTheDocument();
    expect(pushClient.list).toHaveBeenCalled();
  });
});
