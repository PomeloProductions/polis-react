import React from 'react';
import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TemplateEditor from './index';
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
    subject: 'Welcome, {{ user.first_name }}!',
    body_html: '<p>Hi {{ user.first_name }}</p>',
    organization_id: 42,
    source: 'org',
    default_subject: 'Welcome to Polis!',
    default_body_html: '<p>Default body</p>',
    ...overrides,
});

const pushEntry = (overrides: Partial<PushTemplateEntry> = {}): PushTemplateEntry => ({
    key: 'contact_created',
    title: 'New contact, {{ user.first_name }}',
    body: '{{ user.first_name }} wants to connect',
    organization_id: null,
    source: 'default',
    default_title: 'New contact',
    default_body: 'Hello',
    ...overrides,
});

const makeEmailClient = (entry: EmailTemplateEntry): EmailTemplateClient => ({
    list: jest.fn(),
    show: jest.fn().mockResolvedValue(entry),
    update: jest.fn().mockResolvedValue(entry),
    revert: jest.fn().mockResolvedValue(undefined),
});

const makePushClient = (entry: PushTemplateEntry): PushTemplateClient => ({
    list: jest.fn(),
    show: jest.fn().mockResolvedValue(entry),
    update: jest.fn().mockResolvedValue(entry),
    revert: jest.fn().mockResolvedValue(undefined),
});

describe('TemplateEditor (email)', () => {
    test('loads + displays the template when opened', async () => {
        const entry = emailEntry();
        const client = makeEmailClient(entry);

        renderWithMantine(
            <TemplateEditor
                type="email"
                organizationId={42}
                client={client}
                templateKey="welcome"
                onClose={() => {}}
            />,
        );

        await waitFor(() => expect(client.show).toHaveBeenCalledWith(42, 'welcome'));

        const subjectInput = await screen.findByLabelText(/Subject/i);
        expect(subjectInput).toHaveValue(entry.subject);

        // Source badge surfaces the org-override state. Use getAllByText
        // since "Org override" appears in both the badge and the
        // SegmentedControl filter options.
        expect(screen.getAllByText(/Org override/i).length).toBeGreaterThan(0);
    });

    test('renders nothing fetched when templateKey is null', () => {
        const client = makeEmailClient(emailEntry());

        renderWithMantine(
            <TemplateEditor
                type="email"
                organizationId={42}
                client={client}
                templateKey={null}
                onClose={() => {}}
            />,
        );

        expect(client.show).not.toHaveBeenCalled();
    });

    test('saving calls client.update with edited values and fires onSaved', async () => {
        const entry = emailEntry();
        const client = makeEmailClient(entry);
        const onSaved = jest.fn();

        renderWithMantine(
            <TemplateEditor
                type="email"
                organizationId={42}
                client={client}
                templateKey="welcome"
                onClose={() => {}}
                onSaved={onSaved}
            />,
        );

        const subjectInput = await screen.findByLabelText(/Subject/i);
        fireEvent.change(subjectInput, { target: { value: 'New subject' } });

        fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

        await waitFor(() =>
            expect(client.update).toHaveBeenCalledWith(42, 'welcome', {
                subject: 'New subject',
                body_html: entry.body_html,
            }),
        );
        await waitFor(() => expect(onSaved).toHaveBeenCalled());
    });

    test('cancel triggers onClose without calling update', async () => {
        const client = makeEmailClient(emailEntry());
        const onClose = jest.fn();

        renderWithMantine(
            <TemplateEditor
                type="email"
                organizationId={42}
                client={client}
                templateKey="welcome"
                onClose={onClose}
            />,
        );

        await screen.findByLabelText(/Subject/i);

        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

        expect(onClose).toHaveBeenCalled();
        expect(client.update).not.toHaveBeenCalled();
    });

    test('revert calls client.revert when current source is org', async () => {
        const client = makeEmailClient(emailEntry({ source: 'org' }));

        renderWithMantine(
            <TemplateEditor
                type="email"
                organizationId={42}
                client={client}
                templateKey="welcome"
                onClose={() => {}}
            />,
        );

        const revertButton = await screen.findByRole('button', { name: /Revert to default/i });
        expect(revertButton).not.toBeDisabled();
        fireEvent.click(revertButton);

        await waitFor(() => expect(client.revert).toHaveBeenCalledWith(42, 'welcome'));
    });

    test('revert is disabled when source is not org', async () => {
        const client = makeEmailClient(emailEntry({ source: 'default' }));

        renderWithMantine(
            <TemplateEditor
                type="email"
                organizationId={42}
                client={client}
                templateKey="welcome"
                onClose={() => {}}
            />,
        );

        const revertButton = await screen.findByRole('button', { name: /Revert to default/i });
        expect(revertButton).toBeDisabled();
    });

    test('preview tab interpolates variables into subject + body', async () => {
        const client = makeEmailClient(emailEntry());

        renderWithMantine(
            <TemplateEditor
                type="email"
                organizationId={42}
                client={client}
                templateKey="welcome"
                onClose={() => {}}
                previewVariables={{ user: { first_name: 'Ada' } }}
            />,
        );

        await screen.findByLabelText(/Subject/i);

        fireEvent.click(screen.getByRole('tab', { name: /Preview/i }));

        // Interpolated subject and body — both replace {{ user.first_name }}
        expect(await screen.findByText('Welcome, Ada!')).toBeInTheDocument();
        const previewBody = screen.getByTestId('template-preview-body');
        // Email preview uses dangerouslySetInnerHTML — assert the
        // interpolated text appears in the rendered HTML.
        expect(previewBody.innerHTML).toContain('Hi Ada');
    });

    test('save button is disabled when subject or body is empty', async () => {
        const client = makeEmailClient(emailEntry({ subject: '', body_html: '' }));

        renderWithMantine(
            <TemplateEditor
                type="email"
                organizationId={42}
                client={client}
                templateKey="welcome"
                onClose={() => {}}
            />,
        );

        await screen.findByLabelText(/Subject/i);
        const saveButton = screen.getByRole('button', { name: /^Save$/i });
        expect(saveButton).toBeDisabled();
    });

    test('renders an alert when show() rejects', async () => {
        const client: EmailTemplateClient = {
            list: jest.fn(),
            show: jest.fn().mockRejectedValue(new Error('not found')),
            update: jest.fn(),
            revert: jest.fn(),
        };

        renderWithMantine(
            <TemplateEditor
                type="email"
                organizationId={42}
                client={client}
                templateKey="welcome"
                onClose={() => {}}
            />,
        );

        expect(await screen.findByRole('alert')).toHaveTextContent('not found');
    });
});

describe('TemplateEditor (push)', () => {
    test('uses push-specific labels and PUT shape', async () => {
        const entry = pushEntry();
        const client = makePushClient(entry);

        renderWithMantine(
            <TemplateEditor
                type="push"
                organizationId={1}
                client={client}
                templateKey="contact_created"
                onClose={() => {}}
            />,
        );

        const titleInput = await screen.findByLabelText(/Title/i);
        expect(titleInput).toHaveValue(entry.title);

        fireEvent.change(titleInput, { target: { value: 'New title' } });
        fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

        await waitFor(() =>
            expect(client.update).toHaveBeenCalledWith(1, 'contact_created', {
                title: 'New title',
                body: entry.body,
            }),
        );
    });

    test('push preview renders body as plain text (no innerHTML)', async () => {
        const client = makePushClient(pushEntry());

        renderWithMantine(
            <TemplateEditor
                type="push"
                organizationId={1}
                client={client}
                templateKey="contact_created"
                onClose={() => {}}
                previewVariables={{ user: { first_name: 'Ada' } }}
            />,
        );

        await screen.findByLabelText(/Title/i);
        fireEvent.click(screen.getByRole('tab', { name: /Preview/i }));

        const previewBody = await screen.findByTestId('template-preview-body');
        expect(previewBody.textContent).toContain('Ada wants to connect');
    });
});
