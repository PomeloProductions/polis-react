import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Box,
    Button,
    Code,
    Divider,
    Drawer,
    Group,
    Loader,
    Stack,
    Tabs,
    Text,
    TextInput,
    Textarea,
    Title,
} from '@mantine/core';
import type {
    EmailTemplateClient,
    EmailTemplateEntry,
    EmailTemplateUpdate,
    PushTemplateClient,
    PushTemplateEntry,
    PushTemplateUpdate,
    TemplateSource,
} from '../../../models/messaging-template';
import { interpolateTemplate, TemplateVariables } from '../../../util/template-interpolate';

/**
 * Configurable preview variables — a flat or nested object whose dotted
 * paths are substituted into the template subject/body for the preview
 * panel. Example:
 *   { user: { first_name: 'Ada' }, app: { name: 'Polis' } }
 */
export type PreviewVariables = TemplateVariables;

interface BaseProps {
    organizationId: number;
    /**
     * The template key being edited. If null, the drawer is closed
     * (idiomatic Mantine drawer pattern).
     */
    templateKey: string | null;
    /** Fired when the drawer should close. */
    onClose: () => void;
    /**
     * Fired after a successful save or revert so the caller can refresh
     * a parent list. Receives the resulting entry (null for revert).
     */
    onSaved?: () => void;
    /** Sample variables for the preview interpolator. */
    previewVariables?: PreviewVariables;
}

interface EmailTemplateEditorProps extends BaseProps {
    type: 'email';
    client: EmailTemplateClient;
}

interface PushTemplateEditorProps extends BaseProps {
    type: 'push';
    client: PushTemplateClient;
}

export type TemplateEditorProps = EmailTemplateEditorProps | PushTemplateEditorProps;

const SOURCE_COLORS: Record<TemplateSource, string> = {
    org: 'blue',
    global: 'teal',
    default: 'gray',
};

const SOURCE_LABELS: Record<TemplateSource, string> = {
    org: 'Org override',
    global: 'Global default',
    default: 'In-code default',
};

/**
 * Normalized internal model so the editor body doesn't need to branch on
 * `type` every render. Maps both email + push entries onto a
 * subject/body pair so we can render the same form regardless of type.
 */
interface NormalizedEntry {
    key: string;
    /** Subject (email) or title (push). */
    headlineField: string;
    /** body_html (email) or body (push). */
    body: string;
    defaultHeadline: string;
    defaultBody: string;
    source: TemplateSource;
}

function normalizeEmail(entry: EmailTemplateEntry): NormalizedEntry {
    return {
        key: entry.key,
        headlineField: entry.subject,
        body: entry.body_html,
        defaultHeadline: entry.default_subject,
        defaultBody: entry.default_body_html,
        source: entry.source,
    };
}

function normalizePush(entry: PushTemplateEntry): NormalizedEntry {
    return {
        key: entry.key,
        headlineField: entry.title,
        body: entry.body,
        defaultHeadline: entry.default_title,
        defaultBody: entry.default_body,
        source: entry.source,
    };
}

/**
 * Drawer-based editor for a single email or push template. Loads the
 * resolved template + the in-code default via the supplied client,
 * presents both for side-by-side diff/reference, lets the admin edit
 * subject + body, shows a live preview that interpolates against
 * `previewVariables`, saves via PUT, or reverts (deletes the org-scoped
 * row) so the next layer in the lookup chain is used.
 *
 * Designed to be MantineProvider-friendly — the consuming app provides
 * the provider; this component does not assume PolisProvider is mounted.
 *
 * Editor surface:
 *  - email: subject (TextInput) + body_html (Textarea, monospace). HTML
 *    is sent as-is; the API sanitizes on render. A Mantine RichText
 *    editor could be swapped in later, but plain HTML editing keeps the
 *    component dependency-light + side-steps tiptap test fragility.
 *  - push: title (TextInput) + body (Textarea, plain text).
 */
const TemplateEditor: React.FC<TemplateEditorProps> = (props) => {
    const { organizationId, templateKey, onClose, onSaved, previewVariables, type } = props;
    const [entry, setEntry] = useState<NormalizedEntry | null>(null);
    const [headline, setHeadline] = useState<string>('');
    const [body, setBody] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const opened = templateKey !== null;
    const headlineLabel = type === 'email' ? 'Subject' : 'Title';
    const bodyLabel = type === 'email' ? 'Body HTML' : 'Body';
    const drawerTitle = type === 'email' ? 'Edit email template' : 'Edit push template';

    const loadTemplate = useCallback(async () => {
        if (templateKey === null) return;
        setLoading(true);
        setError(null);
        try {
            const result = type === 'email'
                ? normalizeEmail(await props.client.show(organizationId, templateKey))
                : normalizePush(await props.client.show(organizationId, templateKey));
            setEntry(result);
            setHeadline(result.headlineField);
            setBody(result.body);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load template');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizationId, templateKey, type]);

    useEffect(() => {
        if (!opened) {
            setEntry(null);
            setHeadline('');
            setBody('');
            setError(null);
            return;
        }
        loadTemplate();
    }, [opened, loadTemplate]);

    const previewHeadline = useMemo(
        () => interpolateTemplate(headline, previewVariables ?? {}),
        [headline, previewVariables],
    );
    const previewBody = useMemo(
        () => interpolateTemplate(body, previewVariables ?? {}),
        [body, previewVariables],
    );

    const handleSave = async () => {
        if (templateKey === null) return;
        setSaving(true);
        setError(null);
        try {
            if (type === 'email') {
                const payload: EmailTemplateUpdate = { subject: headline, body_html: body };
                const updated = await props.client.update(organizationId, templateKey, payload);
                setEntry(normalizeEmail(updated));
            } else {
                const payload: PushTemplateUpdate = { title: headline, body };
                const updated = await props.client.update(organizationId, templateKey, payload);
                setEntry(normalizePush(updated));
            }
            onSaved?.();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const handleRevert = async () => {
        if (templateKey === null || entry === null) return;
        setSaving(true);
        setError(null);
        try {
            await props.client.revert(organizationId, templateKey);
            onSaved?.();
            // Re-read so the editor reflects the now-fallback state
            await loadTemplate();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to revert template');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position="right"
            size="xl"
            title={drawerTitle}
            padding="lg"
            data-testid="template-editor-drawer"
        >
            <Stack gap="md">
                {loading && (
                    <Group justify="center" py="xl">
                        <Loader size="sm" aria-label="Loading template" />
                    </Group>
                )}

                {error && (
                    <Alert color="red" title="Something went wrong" role="alert">
                        {error}
                    </Alert>
                )}

                {entry && !loading && (
                    <>
                        <Group justify="space-between">
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">Template key</Text>
                                <Code>{entry.key}</Code>
                            </Stack>
                            <Badge color={SOURCE_COLORS[entry.source]} variant="light">
                                {SOURCE_LABELS[entry.source]}
                            </Badge>
                        </Group>

                        <Tabs defaultValue="edit">
                            <Tabs.List>
                                <Tabs.Tab value="edit">Edit</Tabs.Tab>
                                <Tabs.Tab value="preview">Preview</Tabs.Tab>
                                <Tabs.Tab value="default">Default reference</Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="edit" pt="md">
                                <Stack gap="md">
                                    <TextInput
                                        label={headlineLabel}
                                        value={headline}
                                        onChange={(e) => setHeadline(e.currentTarget.value)}
                                        disabled={saving}
                                        required
                                    />
                                    <Textarea
                                        label={bodyLabel}
                                        value={body}
                                        onChange={(e) => setBody(e.currentTarget.value)}
                                        disabled={saving}
                                        required
                                        minRows={12}
                                        autosize
                                        styles={{
                                            input: { fontFamily: 'monospace' },
                                        }}
                                    />
                                </Stack>
                            </Tabs.Panel>

                            <Tabs.Panel value="preview" pt="md">
                                <Stack gap="md">
                                    <Box>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                                            {headlineLabel}
                                        </Text>
                                        <Text fw={600}>{previewHeadline}</Text>
                                    </Box>
                                    <Divider />
                                    <Box>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">
                                            {bodyLabel}
                                        </Text>
                                        {type === 'email' ? (
                                            <Box
                                                data-testid="template-preview-body"
                                                p="sm"
                                                style={{
                                                    border: '1px solid var(--mantine-color-gray-3)',
                                                    borderRadius: 4,
                                                    background: 'var(--mantine-color-gray-0)',
                                                }}
                                                // Preview only — production rendering
                                                // happens server-side after sanitization.
                                                dangerouslySetInnerHTML={{ __html: previewBody }}
                                            />
                                        ) : (
                                            <Text
                                                data-testid="template-preview-body"
                                                style={{ whiteSpace: 'pre-wrap' }}
                                            >
                                                {previewBody}
                                            </Text>
                                        )}
                                    </Box>
                                </Stack>
                            </Tabs.Panel>

                            <Tabs.Panel value="default" pt="md">
                                <Stack gap="md">
                                    <Text size="sm" c="dimmed">
                                        In-code default for this template key. Reverting an org
                                        override will fall back here (or to a global override if
                                        one exists).
                                    </Text>
                                    <Box>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                                            {headlineLabel}
                                        </Text>
                                        <Text>{entry.defaultHeadline || <em>(empty)</em>}</Text>
                                    </Box>
                                    <Divider />
                                    <Box>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb="xs">
                                            {bodyLabel}
                                        </Text>
                                        <Code block>
                                            {entry.defaultBody || '(empty)'}
                                        </Code>
                                    </Box>
                                </Stack>
                            </Tabs.Panel>
                        </Tabs>

                        <Divider />

                        <Group justify="space-between">
                            <Button
                                variant="subtle"
                                color="red"
                                onClick={handleRevert}
                                disabled={saving || entry.source !== 'org'}
                                title={
                                    entry.source !== 'org'
                                        ? 'No org override to revert'
                                        : 'Delete this org override and fall back to the default'
                                }
                            >
                                Revert to default
                            </Button>
                            <Group gap="sm">
                                <Button variant="default" onClick={onClose} disabled={saving}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    loading={saving}
                                    disabled={!headline.trim() || !body.trim()}
                                >
                                    Save
                                </Button>
                            </Group>
                        </Group>
                    </>
                )}
            </Stack>
        </Drawer>
    );
};

export default TemplateEditor;
