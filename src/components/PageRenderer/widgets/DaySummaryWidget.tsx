import React, { useContext, useMemo, useCallback, useRef } from 'react';
import { Paper, SimpleGrid, Stack, Text, Group, Badge, Divider, Tooltip } from '@mantine/core';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { ComponentProps } from '../ComponentRegistry';
import { TodoContext } from '../../../contexts/TodoContext';
import { TimerContext } from '../../../contexts/TimerContext';
import { MeContext } from '../../../contexts/MeContext';
import { TodoBalance } from '../../../models/user/todo';
import { UserPage } from '../../../models/user/user-page';
import { formatHoursHHMM, TodoTaskNode, computeTotals, buildBalanceMap } from '../../Todo/todoTaskUtils';
import { patchTodoNode } from '../../../services/requests/TodoRequests';
import '@mantine/tiptap/styles.css';

interface RemainingItem {
    label: string;
    allotment: number;
    logged: number;
    remaining: number;
}

interface DayStats {
    hoursBalance: number;
    newHoursToday: number;
    loggedToday: number;
    newHoursRemaining: number;
    remainingItems: RemainingItem[];
}

function computeStats(balances: TodoBalance[], page: UserPage | null, today: Date): DayStats {
    const dayOfWeek = today.getDay();
    const bMap = buildBalanceMap(balances);

    let hoursBalance = 0;
    let newHoursToday = 0;
    let loggedToday = 0;
    let newHoursRemaining = 0;
    const remainingItems: RemainingItem[] = [];

    // Walk each ROOT component
    for (const comp of page?.components ?? []) {
        if (comp.component_type !== 'todo_task') continue;
        const config = comp.config_json as Record<string, unknown>;
        const root = config?.root as TodoTaskNode | undefined;
        if (!root) continue;

        const totals = computeTotals(root, undefined, bMap);
        hoursBalance += totals.totalDeficit;
        loggedToday += totals.totalLoggedHours;

        // Per-item: compute new hours and remaining
        const walkForNew = (node: TodoTaskNode) => {
            const nodeHasOwnTracking = node.tracking_mode === 'hours'
                || ((node.tally_step ?? 0) > 0 && (node.time_budget_hours ?? 0) > 0);
            if (node.task_type === 'category' && node.children) {
                node.children.forEach(walkForNew);
                if (!nodeHasOwnTracking) return;
                // Fall through to count the category's own allotment
            }

            const schedule = node.schedule;
            const isScheduled = !schedule || schedule.includes(dayOfWeek);
            if (!isScheduled) return;

            const trackingMode = node.tracking_mode ?? 'units';
            const itemLogged = Number(node.logged_hours ?? 0) + Number(node.logged_time ?? 0);

            let allotment = 0;
            if (trackingMode === 'hours') {
                allotment = Number(node.tally_step ?? 0);
            } else {
                const timeBudget = Number(node.time_budget_hours ?? 0);
                const tallyStep = Number(node.tally_step ?? 0);
                if (timeBudget > 0) allotment = timeBudget * tallyStep;
            }

            if (allotment > 0) {
                // Check if item was worked on: either logged time OR marked done today
                const todayMD = `${today.getMonth() + 1}-${today.getDate()}`;
                const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                const isToday = (ld: string | undefined) => {
                    if (!ld) return false;
                    if (ld.includes('T')) return ld.startsWith(todayYMD);
                    return ld === todayMD;
                };
                const wasMarkedDone = node.task_type === 'rotating' && node.groups?.some((g) =>
                    g.children.some((c) => isToday(c.last_date)) || isToday(g.last_date)
                );
                const itemRemaining = wasMarkedDone
                    ? 0  // Completed by marking done — no time remaining
                    : itemLogged > 0
                        ? Math.max(0, allotment - itemLogged)  // Partially logged
                        : allotment;  // Untouched
                newHoursToday += allotment;
                newHoursRemaining += itemRemaining;
                if (itemRemaining > 0) {
                    remainingItems.push({
                        label: node.label,
                        allotment,
                        logged: itemLogged,
                        remaining: itemRemaining,
                    });
                }
            }
        };
        walkForNew(root);
    }

    return { hoursBalance, newHoursToday, loggedToday, newHoursRemaining, remainingItems };
}

const DaySummaryWidget: React.FC<ComponentProps> = ({ componentId, config, onDisplayUpdate }) => {
    const { balances, currentPage } = useContext(TodoContext);
    const { totalTodaySeconds, activeTimer } = useContext(TimerContext);
    const { me } = useContext(MeContext);

    const todoDate = (currentPage?.config_json as Record<string, unknown>)?.todo_date as string | undefined;
    const today = todoDate ? new Date(todoDate + 'T00:00:00') : new Date();
    const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const baseStats = useMemo(() => computeStats(balances, currentPage, today), [balances, currentPage, today.getTime()]);

    // Add active timer's today-only portion to logged (resets at midnight)
    const activeElapsedHours = activeTimer ? totalTodaySeconds / 3600 : 0;
    const stats = {
        ...baseStats,
        loggedToday: baseStats.loggedToday + activeElapsedHours,
    };

    // Notes via tiptap
    const notes = (config.notes as string) ?? '';
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const configRef = useRef(config);
    configRef.current = config;

    const saveNotes = useCallback((html: string) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            onDisplayUpdate({ ...configRef.current, notes: html });
            // Persist via component update
            if (me?.id) {
                const rootId = (configRef.current.root as Record<string, unknown>)?.id as string | undefined;
                if (rootId) {
                    patchTodoNode(me.id, rootId, componentId, { description: html }).catch(console.error);
                }
            }
        }, 1000);
    }, [me?.id, componentId, onDisplayUpdate]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link,
            Placeholder.configure({ placeholder: 'Write notes for the day...' }),
        ],
        content: notes,
        onUpdate: ({ editor: ed }) => {
            saveNotes(ed.getHTML());
        },
    });

    return (
        <Paper p="md" radius="md" withBorder>
            <Stack gap="md">
                <Group justify="space-between">
                    <Text fw={700} size="lg">{dateLabel}</Text>
                    <Badge size="lg" variant="light" color="blue">My Day</Badge>
                </Group>

                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                    <Paper p="sm" radius="sm" withBorder>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Hours Balance</Text>
                        <Text fw={700} size="lg" c={stats.hoursBalance >= 0 ? 'green' : 'red'}>
                            {stats.hoursBalance >= 0 ? '+' : ''}{formatHoursHHMM(stats.hoursBalance)}
                        </Text>
                    </Paper>
                    <Paper p="sm" radius="sm" withBorder>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={500}>New Hours Today</Text>
                        <Text fw={700} size="lg" c="blue">
                            {formatHoursHHMM(stats.newHoursToday)}
                        </Text>
                    </Paper>
                    <Paper p="sm" radius="sm" withBorder>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Logged Today</Text>
                        <Text fw={700} size="lg" c="teal">
                            {formatHoursHHMM(stats.loggedToday)}
                        </Text>
                    </Paper>
                    <Paper p="sm" radius="sm" withBorder>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={500}>New Hours Remaining</Text>
                        <Tooltip
                            multiline
                            w={300}
                            position="bottom"
                            withArrow
                            label={
                                baseStats.remainingItems.length > 0
                                    ? baseStats.remainingItems.map((ri) =>
                                        `${ri.label}: ${formatHoursHHMM(ri.remaining)}`
                                    ).join('\n')
                                    : 'All tasks fulfilled!'
                            }
                            styles={{ tooltip: { whiteSpace: 'pre-line', fontSize: 12 } }}
                        >
                            <Text fw={700} size="lg" c={stats.newHoursRemaining > 0 ? 'orange' : 'green'} style={{ cursor: 'default' }}>
                                {formatHoursHHMM(stats.newHoursRemaining)}
                            </Text>
                        </Tooltip>
                    </Paper>
                </SimpleGrid>

                <Divider />

                <div>
                    <Text size="sm" fw={500} mb={4}>Notes</Text>
                    <RichTextEditor editor={editor}>
                        <RichTextEditor.Toolbar sticky>
                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.Bold />
                                <RichTextEditor.Italic />
                                <RichTextEditor.Strikethrough />
                            </RichTextEditor.ControlsGroup>
                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.BulletList />
                                <RichTextEditor.OrderedList />
                            </RichTextEditor.ControlsGroup>
                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.H3 />
                                <RichTextEditor.H4 />
                            </RichTextEditor.ControlsGroup>
                            <RichTextEditor.ControlsGroup>
                                <RichTextEditor.Link />
                                <RichTextEditor.Unlink />
                            </RichTextEditor.ControlsGroup>
                        </RichTextEditor.Toolbar>
                        <RichTextEditor.Content />
                    </RichTextEditor>
                </div>
            </Stack>
        </Paper>
    );
};

export default DaySummaryWidget;
