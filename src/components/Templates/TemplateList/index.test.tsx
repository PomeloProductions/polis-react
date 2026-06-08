import React from 'react';
import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TemplateList from './index';
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
  subject: 'Welcome to Polis!',
  body_html: '<p>Hi</p>',
  organization_id: null,
  source: 'default',
  default_subject: 'Welcome to Polis!',
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

const makeEmailClient = (entries: EmailTemplateEntry[]): EmailTemplateClient => ({
  list: jest.fn().mockResolvedValue(entries),
  show: jest.fn(),
  update: jest.fn(),
  revert: jest.fn(),
});

const makePushClient = (entries: PushTemplateEntry[]): PushTemplateClient => ({
  list: jest.fn().mockResolvedValue(entries),
  show: jest.fn(),
  update: jest.fn(),
  revert: jest.fn(),
});

describe('TemplateList (email)', () => {
  test('renders a table row per template, with key + subject + source badge', async () => {
    const client = makeEmailClient([
      emailEntry({ key: 'welcome', subject: 'Welcome!', source: 'default' }),
      emailEntry({
        key: 'renewal_reminder',
        subject: 'Renew soon',
        source: 'org',
        organization_id: 42,
      }),
    ]);

    renderWithMantine(
      <TemplateList type="email" organizationId={42} client={client} onEdit={() => {}} />,
    );

    await waitFor(() => expect(client.list).toHaveBeenCalledWith(42));

    // Both keys render
    expect(await screen.findByText('welcome')).toBeInTheDocument();
    expect(screen.getByText('renewal_reminder')).toBeInTheDocument();

    // Subjects render
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
    expect(screen.getByText('Renew soon')).toBeInTheDocument();

    // Source badges render
    expect(screen.getAllByText(/Org override/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Default/i).length).toBeGreaterThan(0);
  });

  test('clicking Edit triggers onEdit with the row key', async () => {
    const onEdit = jest.fn();
    const client = makeEmailClient([emailEntry({ key: 'welcome' })]);

    renderWithMantine(
      <TemplateList type="email" organizationId={1} client={client} onEdit={onEdit} />,
    );

    const editButton = await screen.findByLabelText('Edit welcome');
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledWith('welcome');
  });

  test('filtering by source hides non-matching rows', async () => {
    const client = makeEmailClient([
      emailEntry({ key: 'welcome', source: 'default' }),
      emailEntry({ key: 'org_only', source: 'org' }),
    ]);

    renderWithMantine(
      <TemplateList type="email" organizationId={1} client={client} onEdit={() => {}} />,
    );

    await screen.findByText('welcome');
    // SegmentedControl renders hidden radio inputs that are toggleable.
    // Querying by role + name targets the filter exclusively (the
    // table badges with the same text are visual-only, not radios).
    fireEvent.click(screen.getByRole('radio', { name: 'Org override' }));

    await waitFor(() => expect(screen.queryByText('welcome')).not.toBeInTheDocument());
    expect(screen.getByText('org_only')).toBeInTheDocument();
  });

  test('renders an empty-state row when filter yields no matches', async () => {
    const client = makeEmailClient([emailEntry({ key: 'welcome', source: 'default' })]);

    renderWithMantine(
      <TemplateList type="email" organizationId={1} client={client} onEdit={() => {}} />,
    );

    await screen.findByText('welcome');
    fireEvent.click(screen.getByRole('radio', { name: 'Org override' }));

    expect(await screen.findByText(/No templates match/i)).toBeInTheDocument();
  });

  test('renders an alert when the client rejects', async () => {
    const client: EmailTemplateClient = {
      list: jest.fn().mockRejectedValue(new Error('boom')),
      show: jest.fn(),
      update: jest.fn(),
      revert: jest.fn(),
    };

    renderWithMantine(
      <TemplateList type="email" organizationId={1} client={client} onEdit={() => {}} />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
  });
});

describe('TemplateList (push)', () => {
  test('renders the push-specific headline column label', async () => {
    const client = makePushClient([pushEntry({ key: 'contact_created', title: 'New contact!' })]);

    renderWithMantine(
      <TemplateList type="push" organizationId={1} client={client} onEdit={() => {}} />,
    );

    await screen.findByText('contact_created');
    // Push uses "Title" as the column heading, not "Subject".
    expect(screen.getByRole('columnheader', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText('New contact!')).toBeInTheDocument();
  });
});
