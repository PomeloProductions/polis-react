import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Group,
    Loader,
    Paper,
    SegmentedControl,
    Stack,
    Table,
    Text,
    Title,
} from '@mantine/core';
import type {
    EmailTemplateClient,
    EmailTemplateEntry,
    PushTemplateClient,
    PushTemplateEntry,
    TemplateSource,
} from '../../../models/messaging-template';

/**
 * Shared display row — both email and push templates expose a key + a
 * source + a single "subject-or-title" text column that we render in the
 * table. The TemplateList collapses the per-type differences into this
 * shape so the table renderer stays generic.
 */
interface DisplayRow {
    key: string;
    /** Subject for email, title for push. */
    headline: string;
    source: TemplateSource;
    organization_id: number | null;
}

type SourceFilter = 'all' | TemplateSource;

interface BaseProps {
    organizationId: number;
    /** Fires when the user clicks the row's edit button. */
    onEdit: (key: string) => void;
    /** Optional title override; defaults vary by type. */
    title?: string;
}

interface EmailTemplateListProps extends BaseProps {
    type: 'email';
    client: EmailTemplateClient;
}

interface PushTemplateListProps extends BaseProps {
    type: 'push';
    client: PushTemplateClient;
}

export type TemplateListProps = EmailTemplateListProps | PushTemplateListProps;

const SOURCE_COLORS: Record<TemplateSource, string> = {
    org: 'blue',
    global: 'teal',
    default: 'gray',
};

const SOURCE_LABELS: Record<TemplateSource, string> = {
    org: 'Org override',
    global: 'Global',
    default: 'Default',
};

function toEmailRow(entry: EmailTemplateEntry): DisplayRow {
    return {
        key: entry.key,
        headline: entry.subject,
        source: entry.source,
        organization_id: entry.organization_id,
    };
}

function toPushRow(entry: PushTemplateEntry): DisplayRow {
    return {
        key: entry.key,
        headline: entry.title,
        source: entry.source,
        organization_id: entry.organization_id,
    };
}

/**
 * Admin table that lists every email-or-push template the current
 * organization can edit. Each row shows the resolved subject/title and
 * a badge indicating whether the value is sourced from an org override,
 * a global default, or the in-code fallback. Filter by source via the
 * segmented control at the top.
 *
 * Generic over email vs push — pass `type` + a matching `client`
 * implementation. The client is what fetches from the polis-laravel
 * admin endpoints; supply your own (mockable) implementation or use the
 * `emailTemplateRequests` / `pushTemplateRequests` defaults exported
 * from `@polis/react/services/MessagingTemplateRequests`.
 */
const TemplateList: React.FC<TemplateListProps> = (props) => {
    const { organizationId, onEdit, type, title } = props;
    const [entries, setEntries] = useState<DisplayRow[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        const promise = type === 'email'
            ? props.client.list(organizationId).then((rows) => rows.map(toEmailRow))
            : props.client.list(organizationId).then((rows) => rows.map(toPushRow));
        promise
            .then((rows) => {
                if (cancelled) return;
                setEntries(rows);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Failed to load templates');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // We deliberately depend on `type` separately from the discriminated
        // `client` — the client identity is allowed to change without
        // re-fetching, but a type switch must refetch from scratch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizationId, type]);

    const filtered = useMemo(() => {
        if (entries === null) return [];
        if (sourceFilter === 'all') return entries;
        return entries.filter((row) => row.source === sourceFilter);
    }, [entries, sourceFilter]);

    const resolvedTitle = title ?? (type === 'email' ? 'Email templates' : 'Push templates');
    const headlineLabel = type === 'email' ? 'Subject' : 'Title';

    return (
        <Paper p="md" radius="md" withBorder>
            <Stack gap="md">
                <Group justify="space-between" align="flex-end" wrap="wrap">
                    <Title order={3}>{resolvedTitle}</Title>
                    <SegmentedControl
                        value={sourceFilter}
                        onChange={(value) => setSourceFilter(value as SourceFilter)}
                        aria-label="Filter by source"
                        data={[
                            { label: 'All', value: 'all' },
                            { label: 'Org override', value: 'org' },
                            { label: 'Global', value: 'global' },
                            { label: 'Default', value: 'default' },
                        ]}
                    />
                </Group>

                {error && (
                    <Alert color="red" title="Could not load templates" role="alert">
                        {error}
                    </Alert>
                )}

                {loading && entries === null && (
                    <Group justify="center" py="xl">
                        <Loader size="sm" aria-label="Loading templates" />
                    </Group>
                )}

                {entries !== null && (
                    <Table highlightOnHover role="table">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Key</Table.Th>
                                <Table.Th>{headlineLabel}</Table.Th>
                                <Table.Th>Source</Table.Th>
                                <Table.Th aria-label="Actions" />
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filtered.length === 0 && (
                                <Table.Tr>
                                    <Table.Td colSpan={4}>
                                        <Text c="dimmed" ta="center" py="md">
                                            No templates match the current filter.
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                            {filtered.map((row) => (
                                <Table.Tr key={row.key} data-testid={`template-row-${row.key}`}>
                                    <Table.Td>
                                        <Text fw={600} ff="monospace">
                                            {row.key}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text lineClamp={1}>{row.headline}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge color={SOURCE_COLORS[row.source]} variant="light">
                                            {SOURCE_LABELS[row.source]}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Button
                                            size="xs"
                                            variant="subtle"
                                            onClick={() => onEdit(row.key)}
                                            aria-label={`Edit ${row.key}`}
                                        >
                                            Edit
                                        </Button>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                )}
            </Stack>
        </Paper>
    );
};

export default TemplateList;
