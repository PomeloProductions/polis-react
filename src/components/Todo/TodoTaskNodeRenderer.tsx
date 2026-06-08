import React, { useContext, useEffect, useState } from 'react';
import {
    Stack,
    Group,
    Text,
    TextInput,
    ActionIcon,
    Paper,
    Badge,
    Collapse,
    Popover,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import {
    IconChevronDown,
    IconChevronRight,
    IconCheck,
    IconSettings,
    IconPlayerPlay,
    IconPlayerStop,
    IconGripVertical,
} from '@tabler/icons-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { TimerContext } from '../../contexts/TimerContext';
import { TodoContext } from '../../contexts/TodoContext';
import TodoTaskSettingsDrawer from './TodoTaskSettingsDrawer';
import {
    TodoTaskNode,
    RotatingGroup,
    computeTotals,
    computeTotalTally,
    computeDailyBudget,
    buildBalanceMap,
    scheduleToString,
    formatTimeRemaining,
    formatHoursHHMM,
    parseHHMM,
    formatLastDate,
    getDeepNextItem,
} from './todoTaskUtils';

interface TodoTaskNodeRendererProps {
    node: TodoTaskNode;
    path: number[];
    componentId: number;
    onUpdate: (path: number[], patch: Partial<TodoTaskNode>) => void;
    onRemove?: (path: number[]) => void;
    depth?: number;
    siblingIndex?: number;
    /** When true, render inline inside a group — skip the outer header/wrapper */
    inline?: boolean;
    /** Called when a mark-done happens inside an inline node — receives inner patch to combine with parent */
    onInlineDone?: (innerPatch: Partial<TodoTaskNode>) => void;
}

const TodoTaskNodeRenderer: React.FC<TodoTaskNodeRendererProps> = ({
    node,
    path,
    componentId,
    onUpdate,
    onRemove,
    depth = 0,
    siblingIndex,
    inline = false,
    onInlineDone,
}) => {
    const { startTimer, stopTimer, isTracking, elapsedSeconds, registerOnStop, registerAfterStop, labelCurrentSession, resetSession } = useContext(TimerContext);
    const { balances, refreshBalances, silentRefresh } = useContext(TodoContext);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [editingTally, setEditingTally] = useState(false);
    const [tallyText, setTallyText] = useState('');
    const [editingBalance, setEditingBalance] = useState(false);
    const [balanceText, setBalanceText] = useState('');
    const [editingGroupCount, setEditingGroupCount] = useState<number | null>(null);
    const [groupCountText, setGroupCountText] = useState('');
    const [editingItemDate, setEditingItemDate] = useState<string | null>(null);

    const collapsed = node.collapsed ?? false;
    const isHoursMode = node.tracking_mode === 'hours';
    const schedStr = scheduleToString(node.schedule);

    // For hours-mode nodes with a balance FK, use the authoritative balance from the API
    // Unit-mode nodes still read tally from config_json until balances are fully caught up
    const balanceMap = React.useMemo(() => buildBalanceMap(balances), [balances]);
    const apiBalance = isHoursMode && node.todo_balance_id
        ? balanceMap.get(node.todo_balance_id)
        : undefined;
    const tally = apiBalance !== undefined ? apiBalance : (node.tally ?? 0);

    const totals = computeTotals(node, apiBalance !== undefined ? tally : undefined, balanceMap);
    const hasBudget = totals.totalBudgetHours > 0;

    // Timer
    const itemId = node.id;
    const tracking = isTracking(componentId, itemId);
    const hasTimeTracking = node.time_budget_hours !== undefined || node.logged_hours !== undefined || node.logged_time !== undefined;
    const nodeHasOwnTracking = isHoursMode || ((node.tally_step ?? 0) > 0 && (node.time_budget_hours ?? 0) > 0);
    const canTrack = (node.task_type !== 'category' || nodeHasOwnTracking) && (isHoursMode || hasBudget || hasTimeTracking);
    const loggedHoursKey = node.task_type === 'rotating' ? 'logged_time' : 'logged_hours';
    const currentLogged = (node.task_type === 'rotating' ? node.logged_time : node.logged_hours) ?? 0;
    const isAccumulative = true; // Always accumulative — logged hours add up across sessions
    const computeNewLogged = (elapsed: number) => currentLogged + elapsed;

    useEffect(() => {
        if (tracking && canTrack) {
            registerOnStop(componentId, itemId, (elapsed) => {
                const patch: Partial<TodoTaskNode> = { [loggedHoursKey]: computeNewLogged(elapsed) };
                // Hours mode: subtract logged time from tally (the balance)
                // Still update node.tally for persistence, but display will use API balance
                if (isHoursMode) {
                    patch.tally = tally - elapsed;
                }
                onUpdate(path, patch);
            }, {
                sessionBudgetHours: isHoursMode ? 0 : node.time_budget_hours,
                preLoggedHours: isAccumulative ? currentLogged : 0,
                balanceHours: isHoursMode ? -tally : undefined,
                dailyTargetHours: isHoursMode ? (node.tally_step ?? 0) : undefined,
                todoBalanceId: node.todo_balance_id,
                budgetHours: isHoursMode ? 0 : totals.totalBudgetHours,
                onUpdateBalance: isHoursMode ? (newBalance: number) => {
                    onUpdate(path, { tally: -newBalance });
                } : undefined,
            });
            // After backend confirms stop, refresh balances and page data
            registerAfterStop(() => {
                refreshBalances();
                silentRefresh();
            });
        }
    }, [tracking, componentId, itemId, canTrack, currentLogged, isAccumulative, isHoursMode, tally]); // eslint-disable-line react-hooks/exhaustive-deps

    const liveBudget = totals.totalBudgetHours;

    // Rotating logic
    const cascadeRatio = node.cascade_ratio ?? 2;
    const groups = node.groups ?? [];
    const deepNext = node.task_type === 'rotating' ? getDeepNextItem(groups, cascadeRatio) : undefined;
    const currentGroupNum = deepNext?.groupNum;
    const nextItemId = deepNext?.itemId;
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(
        new Set(currentGroupNum !== undefined ? [currentGroupNum] : [])
    );
    // Auto-expand the current group when it changes
    useEffect(() => {
        if (currentGroupNum !== undefined) {
            setExpandedGroups((prev) => {
                if (prev.has(currentGroupNum)) return prev;
                const next = new Set(prev);
                next.add(currentGroupNum);
                return next;
            });
        }
    }, [currentGroupNum]);
    const toggleGroupExpand = (groupNum: number) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            next.has(groupNum) ? next.delete(groupNum) : next.add(groupNum);
            return next;
        });
    };
    const shouldDecrement = node.decrement_on_done !== false; // default true

    /**
     * Mark done at the top-level group/item (no sub_groups involved).
     */
    const markDone = (groupNum: number, rItemId: string) => {
        const d = new Date();
        const formatted = d.toISOString();
        if (tracking) {
            const group = groups.find((g) => g.group_number === groupNum);
            const item = group?.children.find((i) => i.id === rItemId);
            if (item) labelCurrentSession(item.label);
        }
        // Always reset session on mark-done (clears lastSessionRef when stopped, restarts entry when running)
        resetSession();

        const updatedGroups = groups.map((g) =>
            g.group_number === groupNum
                ? {
                      ...g,
                      count_this_group: g.count_this_group + 1,
                      children: g.children.map((item) =>
                          item.id === rItemId ? { ...item, last_date: formatted, tally: (item.tally ?? 0) + 1 } : item
                      ),
                  }
                : g
        );

        // Cascade reset: subtract ratio^n from each group where n = (total - 1 - index)
        const lastGroup = updatedGroups[updatedGroups.length - 1];
        if (lastGroup && groupNum === lastGroup.group_number && updatedGroups.length > 1) {
            let subtraction = 1;
            for (let i = updatedGroups.length - 1; i >= 0; i--) {
                const cur = updatedGroups[i];
                updatedGroups[i] = { ...cur, count_this_group: cur.count_this_group - subtraction };
                subtraction *= cascadeRatio;
            }
        }

        const patch: Partial<TodoTaskNode> = { groups: updatedGroups };
        if (shouldDecrement) {
            patch.tally = tally - 1;
        }
        if (onInlineDone) {
            // Don't PATCH here — let onInlineDone combine inner + parent into one patch
            onInlineDone(patch);
        } else {
            onUpdate(path, patch);
        }
    };

    /**
     * Mark done on a top-level group itself (no items — the group is the target).
     */
    const markGroupDone = (groupNum: number) => {
        const d = new Date();
        const formatted = d.toISOString();
        if (tracking) {
            const group = groups.find((g) => g.group_number === groupNum);
            if (group) labelCurrentSession(group.label ?? `#${groupNum}`);
        }
        resetSession();

        const updatedGroups = groups.map((g) =>
            g.group_number === groupNum
                ? { ...g, count_this_group: g.count_this_group + 1, last_date: formatted }
                : g
        );

        // 2:1 cascade reset
        const lastGroup = updatedGroups[updatedGroups.length - 1];
        if (lastGroup && groupNum === lastGroup.group_number && updatedGroups.length > 1) {
            let subtraction = 1;
            for (let i = updatedGroups.length - 1; i >= 0; i--) {
                const cur = updatedGroups[i];
                updatedGroups[i] = { ...cur, count_this_group: cur.count_this_group - subtraction };
                subtraction *= cascadeRatio;
            }
        }

        const patch: Partial<TodoTaskNode> = { groups: updatedGroups };
        if (shouldDecrement) {
            patch.tally = tally - 1;
        }
        if (onInlineDone) {
            onInlineDone(patch);
        } else {
            onUpdate(path, patch);
        }
    };

    // =========================================================================
    // UNIFORM HEADER — identical for all three types
    // Format: v  Label (budget schedule) (description)  X n  ........  Xh remaining  ▶  ⚙
    // =========================================================================
    const buildLabelText = () => {
        const prefix = node.task_type === 'category' && depth > 0 && siblingIndex !== undefined
            ? `${siblingIndex + 1}. `
            : '';

        let budgetPart = '';
        if (node.task_type === 'category') {
            const dailyBudget = computeDailyBudget(node);
            if (dailyBudget > 0) {
                budgetPart = ` (${dailyBudget} hour${dailyBudget !== 1 ? 's' : ''}${schedStr ? ` ${schedStr}` : ''})`;
            }
        } else if (isHoursMode) {
            const hoursPerDay = node.tally_step ?? 0;
            if (hoursPerDay > 0) {
                budgetPart = ` (${hoursPerDay} hour${hoursPerDay !== 1 ? 's' : ''}${schedStr ? ` ${schedStr}` : ''})`;
            }
        } else {
            const perUnit = node.time_budget_hours ?? 0;
            if (perUnit > 0) {
                budgetPart = ` (${perUnit} hour${perUnit !== 1 ? 's' : ''}${schedStr ? ` ${schedStr}` : ''})`;
            }
        }

        const descPart = node.description ? ` (${node.description})` : '';
        return prefix + node.label + budgetPart + descPart;
    };

    const labelText = buildLabelText();
    const displayTally = node.task_type === 'category' ? computeTotalTally(node) : tally;
    const showTally = node.task_type !== 'category' && !isHoursMode && (node.tally_step ?? 0) > 0;
    // Use static (persisted) logged hours for the "remaining" display, not live timer
    const staticLogged = node.task_type === 'category' ? totals.totalLoggedHours : currentLogged;
    const remaining = liveBudget - staticLogged;
    const isOver = remaining < 0;
    // Adjust deficit for active timer elapsed time
    const timerElapsedHours = tracking ? elapsedSeconds / 3600 : 0;
    const deficitVal = isHoursMode && tracking
        ? totals.totalDeficit + timerElapsedHours  // timer reduces deficit (makes it more positive/less negative)
        : totals.totalDeficit;

    // Deficit/balance display (shown on all node types when non-zero)
    // Hours-mode leaf nodes: click to edit the balance (tally)
    const canEditBalance = isHoursMode && (node.task_type !== 'category' || nodeHasOwnTracking);
    const showDeficit = deficitVal !== 0 || (node.tally_step ?? 0) > 0;
    const deficitDisplay = showDeficit && (
        editingBalance && canEditBalance ? (
            <TextInput
                size="xs"
                w={80}
                value={balanceText}
                placeholder="H:MM"
                autoFocus
                onChange={(e) => setBalanceText(e.target.value)}
                onBlur={() => {
                    const val = parseHHMM(balanceText);
                    if (!isNaN(val)) onUpdate(path, { tally: -val, _manual_balance_edit: true } as Partial<TodoTaskNode>);
                    setEditingBalance(false);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        const val = parseHHMM(balanceText);
                        if (!isNaN(val)) onUpdate(path, { tally: -val, _manual_balance_edit: true } as Partial<TodoTaskNode>);
                        setEditingBalance(false);
                    } else if (e.key === 'Escape') {
                        setEditingBalance(false);
                    }
                }}
                onClick={(e) => e.stopPropagation()}
            />
        ) : (
            <Text
                size="xs"
                c={deficitVal >= 0 ? 'green' : 'red'}
                fw={500}
                style={canEditBalance ? { cursor: 'pointer' } : undefined}
                onClick={canEditBalance ? (e) => {
                    e.stopPropagation();
                    setBalanceText(formatHoursHHMM(deficitVal));
                    setEditingBalance(true);
                } : undefined}
            >
                {deficitVal >= 0 ? '+' : ''}{formatHoursHHMM(deficitVal)}
            </Text>
        )
    );

    // Tally badge (shared between collapsible header and line item row)
    const isCategory = node.task_type === 'category';
    const tallyBadge = showTally && (
        editingTally && !isCategory ? (
            <TextInput
                value={tallyText}
                size="xs"
                w={80}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || v === '-' || /^-?\d*\.?\d*$/.test(v)) setTallyText(v);
                }}
                onBlur={() => {
                    const parsed = parseFloat(tallyText);
                    if (!isNaN(parsed)) onUpdate(path, { tally: parsed });
                    setEditingTally(false);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        const parsed = parseFloat(tallyText);
                        if (!isNaN(parsed)) onUpdate(path, { tally: parsed });
                        setEditingTally(false);
                    }
                }}
            />
        ) : (
            <Badge
                variant="light"
                color={isCategory ? 'gray' : 'blue'}
                size="sm"
                style={isCategory ? undefined : { cursor: 'pointer' }}
                onClick={isCategory ? undefined : (e) => {
                    e.stopPropagation();
                    setTallyText(String(tally));
                    setEditingTally(true);
                }}
            >
                X {displayTally}
            </Badge>
        )
    );

    // Right-side controls (shared)
    // Categories only show deficit (children show their own remaining)
    // Hours mode always shows balance (via deficitDisplay), never "remaining"
    const showRemaining = !isHoursMode && hasBudget && node.task_type !== 'category' && !deficitDisplay;
    const rightControls = (
        <Group gap="xs" wrap="nowrap">
            {deficitDisplay}
            {showRemaining && (
                <Text size="xs" c={isOver ? 'red' : 'dimmed'} fw={isOver ? 600 : undefined}>
                    {formatTimeRemaining(liveBudget, staticLogged)}
                </Text>
            )}
            {canTrack && (
                tracking ? (
                    <ActionIcon variant="filled" color="red" size="xs" onClick={stopTimer} title="Stop tracking">
                        <IconPlayerStop size={12} />
                    </ActionIcon>
                ) : (
                    <ActionIcon
                        variant="light"
                        color="blue"
                        size="xs"
                        onClick={() => {
                            const onStop = (elapsed: number) => {
                                const patch: Partial<TodoTaskNode> = { [loggedHoursKey]: computeNewLogged(elapsed) };
                                if (isHoursMode) patch.tally = tally - elapsed;
                                onUpdate(path, patch);
                            };
                            startTimer({
                                componentId,
                                itemId,
                                label: node.label,
                                budgetHours: isHoursMode ? 0 : liveBudget,
                                sessionBudgetHours: isHoursMode ? 0 : node.time_budget_hours,
                                preLoggedHours: isAccumulative ? currentLogged : 0,
                                balanceHours: isHoursMode ? -tally : undefined,
                                dailyTargetHours: isHoursMode ? (node.tally_step ?? 0) : undefined,
                                todoBalanceId: node.todo_balance_id,
                                onStop,
                                onUpdateBalance: isHoursMode ? (newBalance: number) => {
                                    onUpdate(path, { tally: -newBalance });
                                } : undefined,
                            });
                        }}
                        title="Start tracking"
                    >
                        <IconPlayerPlay size={12} />
                    </ActionIcon>
                )
            )}
            <ActionIcon variant="light" size="sm" onClick={() => setSettingsOpen(true)} title="Settings">
                <IconSettings size={14} />
            </ActionIcon>
        </Group>
    );

    // Collapsible header for category/rotating (with chevron)
    const collapsibleHeader = (
        <Group justify="space-between" mb={collapsed ? 0 : 'sm'}>
            <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => onUpdate(path, { collapsed: !collapsed })}>
                {collapsed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
                <Text fw={600} size={depth === 0 ? 'md' : 'sm'}>
                    {labelText}
                </Text>
                {tallyBadge}
            </Group>
            {rightControls}
        </Group>
    );

    const settingsDrawer = (
        <TodoTaskSettingsDrawer
            node={node}
            opened={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onUpdate={(patch) => onUpdate(path, patch)}
            onRemove={onRemove ? () => { onRemove(path); setSettingsOpen(false); } : undefined}
        />
    );

    // =========================================================================
    // BODY — differs by type
    // =========================================================================

    // LINE ITEM: flat row, no Paper, no collapse, no chevron
    // Format: Label (budget) X n ............ ✓ Xh remaining ▶ ⚙
    if (node.task_type === 'line_item') {
        const markLineDone = () => {
            if (tracking) labelCurrentSession(node.label);
            if (shouldDecrement) {
                onUpdate(path, { tally: tally - 1 });
            }
        };

        return (
            <Stack gap={2}>
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="xs">
                        <Text fw={600} size="sm">
                            {labelText}
                        </Text>
                        {tallyBadge}
                    </Group>
                    <Group gap="xs" wrap="nowrap">
                        {deficitDisplay}
                        {!isHoursMode && !deficitDisplay && hasBudget && (
                            <Text size="xs" c={isOver ? 'red' : 'dimmed'} fw={isOver ? 600 : undefined}>
                                {formatTimeRemaining(liveBudget, currentLogged)}
                            </Text>
                        )}
                        {canTrack && (
                            tracking ? (
                                <ActionIcon variant="filled" color="red" size="xs" onClick={stopTimer} title="Stop tracking">
                                    <IconPlayerStop size={12} />
                                </ActionIcon>
                            ) : (
                                <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="xs"
                                    onClick={() => {
                                        const onStop = (elapsed: number) => {
                                            const patch: Partial<TodoTaskNode> = { [loggedHoursKey]: computeNewLogged(elapsed) };
                                            if (isHoursMode) patch.tally = (node.tally ?? 0) - elapsed;
                                            onUpdate(path, patch);
                                        };
                                        startTimer({
                                            componentId,
                                            itemId,
                                            label: node.label,
                                            budgetHours: isHoursMode ? 0 : liveBudget,
                                            sessionBudgetHours: isHoursMode ? 0 : node.time_budget_hours,
                                            preLoggedHours: isAccumulative ? currentLogged : 0,
                                            balanceHours: isHoursMode ? -(node.tally ?? 0) : undefined,
                                            dailyTargetHours: isHoursMode ? (node.tally_step ?? 0) : undefined,
                                            todoBalanceId: node.todo_balance_id,
                                            onStop,
                                            onUpdateBalance: isHoursMode ? (newBalance: number) => {
                                                onUpdate(path, { tally: -newBalance });
                                            } : undefined,
                                        });
                                    }}
                                    title="Start tracking"
                                >
                                    <IconPlayerPlay size={12} />
                                </ActionIcon>
                            )
                        )}
                        {!isHoursMode && <ActionIcon
                            variant="light"
                            color="green"
                            size="xs"
                            onClick={markLineDone}
                            title="Mark done (decrement tally)"
                        >
                            <IconCheck size={12} />
                        </ActionIcon>}
                        <ActionIcon variant="light" size="sm" onClick={() => setSettingsOpen(true)} title="Settings">
                            <IconSettings size={14} />
                        </ActionIcon>
                    </Group>
                </Group>
                {node.sub_items && node.sub_items.length > 0 && (
                    <Stack gap={0} pl="lg">
                        {node.sub_items.map((sub) => (
                            <Text key={sub.id} size="xs" c="dimmed">
                                - {sub.text}
                            </Text>
                        ))}
                    </Stack>
                )}
                {settingsDrawer}
            </Stack>
        );
    }

    // CATEGORY body: children + "Add item..." input
    if (node.task_type === 'category') {
        const children = node.children ?? [];
        const droppableId = `comp:${componentId}:drop:${path.join('.')}`;
        return (
            <Paper p={depth === 0 ? 'md' : 'xs'} radius={depth === 0 ? 'md' : 'sm'} withBorder>
                {collapsibleHeader}
                <Collapse in={!collapsed}>
                    <Droppable droppableId={droppableId} type="TODO_NODE">
                        {(provided, snapshot) => (
                            <Stack
                                gap="xs"
                                pl={depth > 0 ? 'xs' : 0}
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{
                                    minHeight: 4,
                                    ...(snapshot.isDraggingOver ? {
                                        backgroundColor: 'var(--polis-color-surface-alt, var(--mantine-color-blue-0))',
                                        borderRadius: 4,
                                    } : {}),
                                }}
                            >
                                {children.map((child, idx) => (
                                    <Draggable key={child.id} draggableId={child.id} index={idx}>
                                        {(dragProvided, dragSnapshot) => (
                                            <div
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                                style={{
                                                    ...dragProvided.draggableProps.style,
                                                    ...(dragSnapshot.isDragging ? { opacity: 0.8 } : {}),
                                                }}
                                            >
                                                <Group gap={4} wrap="nowrap" align="flex-start">
                                                    <div
                                                        {...dragProvided.dragHandleProps}
                                                        style={{ cursor: 'grab', paddingTop: 8 }}
                                                    >
                                                        <IconGripVertical size={14} color="var(--mantine-color-gray-5)" />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <TodoTaskNodeRenderer
                                                            node={child}
                                                            path={[...path, idx]}
                                                            componentId={componentId}
                                                            onUpdate={onUpdate}
                                                            onRemove={onRemove}
                                                            depth={depth + 1}
                                                            siblingIndex={idx}
                                                        />
                                                    </div>
                                                </Group>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </Stack>
                        )}
                    </Droppable>
                </Collapse>
                {settingsDrawer}
            </Paper>
        );
    }

    // ROTATING body: priority groups
    const isSingleGroup = groups.length === 1;

    // Helper: render items list for a group (flat items only)
    const renderGroupItems = (group: RotatingGroup, activeItemId?: string) => (
        <Stack gap="xs">
            {group.children.map((item, idx) => {
                // If the child is a non-line_item type, render it inline (no outer header)
                // Use a direct onUpdate that patches by the child's own client_id
                // (group children aren't in the category tree, so path-based resolution doesn't work)
                if (item.task_type !== 'line_item') {
                    // Single onUpdate that handles both inner changes AND parent propagation
                    const inlineOnUpdate = (_path: number[], patch: Partial<TodoTaskNode>) => {
                        // Merge inner changes into parent groups
                        const updatedGroups = groups.map((g) =>
                            g.group_number === group.group_number
                                ? { ...g, children: g.children.map((c) => c.id === item.id ? { ...c, ...patch } : c) }
                                : g
                        );
                        onUpdate(path, { groups: updatedGroups } as Partial<TodoTaskNode>);
                    };
                    // Combined: receives inner patch, merges with parent group increment, sends ONE patch
                    const inlineDone = (innerPatch: Partial<TodoTaskNode>) => {
                        const formatted = new Date().toISOString();
                        // Start with parent groups, merge inner child changes AND increment parent group
                        const updatedGroups = groups.map((g) => {
                            if (g.group_number === group.group_number) {
                                // Merge inner child changes into this group's children
                                const updatedChildren = g.children.map((c) =>
                                    c.id === item.id ? { ...c, ...innerPatch } : c
                                );
                                return { ...g, children: updatedChildren, count_this_group: g.count_this_group + 1, last_date: formatted };
                            }
                            return g;
                        });
                        // Cascade at parent level
                        const lastGrp = updatedGroups[updatedGroups.length - 1];
                        if (lastGrp && group.group_number === lastGrp.group_number && updatedGroups.length > 1) {
                            let sub = 1;
                            for (let i = updatedGroups.length - 1; i >= 0; i--) {
                                updatedGroups[i] = { ...updatedGroups[i], count_this_group: updatedGroups[i].count_this_group - sub };
                                sub *= cascadeRatio;
                            }
                        }
                        const combined: Partial<TodoTaskNode> = { groups: updatedGroups };
                        if (shouldDecrement) combined.tally = tally - 1;
                        onUpdate(path, combined);
                    };
                    return (
                        <TodoTaskNodeRenderer
                            key={item.id}
                            node={item}
                            path={[]}
                            componentId={componentId}
                            onUpdate={inlineOnUpdate}
                            onRemove={onRemove}
                            depth={depth + 1}
                            siblingIndex={idx}
                            inline
                            onInlineDone={inlineDone}
                        />
                    );
                }

                const isNextToDo = item.id === activeItemId;

                return (
                    <Group
                        key={item.id}
                        gap="xs"
                        wrap="nowrap"
                        style={isNextToDo ? {
                            backgroundColor: 'var(--polis-color-surface-alt, var(--mantine-color-blue-0))',
                            borderRadius: 4,
                            padding: '2px 4px',
                            margin: '-2px -4px',
                        } : undefined}
                    >
                        <Text size="xs" c="dimmed" w={16} ta="right">{idx + 1}.</Text>
                        <Text size="sm" style={{ flex: 1 }}>{item.label}</Text>
                        <Popover
                            opened={editingItemDate === item.id}
                            onClose={() => setEditingItemDate(null)}
                            position="bottom-end"
                            withinPortal
                        >
                            <Popover.Target>
                                <Text
                                    size="xs"
                                    c="dimmed"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingItemDate(item.id);
                                    }}
                                >
                                    {formatLastDate(item.last_date)}
                                </Text>
                            </Popover.Target>
                            <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
                                <DatePicker
                                    value={(() => {
                                        if (!item.last_date) return null;
                                        if (item.last_date.includes('T')) {
                                            const d = new Date(item.last_date);
                                            return isNaN(d.getTime()) ? null : d;
                                        }
                                        const parts = item.last_date.split('-');
                                        if (parts.length !== 2) return null;
                                        const now = new Date();
                                        return new Date(now.getFullYear(), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
                                    })()}
                                    onChange={(date) => {
                                        const formatted = date ? date.toISOString() : undefined;
                                        onUpdate(path, {
                                            groups: groups.map((g) =>
                                                g.group_number === group.group_number
                                                    ? { ...g, children: g.children.map((it) => it.id === item.id ? { ...it, last_date: formatted } : it) }
                                                    : g
                                            ),
                                        });
                                        setEditingItemDate(null);
                                    }}
                                    maxDate={new Date()}
                                />
                            </Popover.Dropdown>
                        </Popover>
                        <ActionIcon
                            variant="light"
                            color="green"
                            size="xs"
                            onClick={(e) => { e.stopPropagation(); markDone(group.group_number, item.id); }}
                            title="Mark done"
                        >
                            <IconCheck size={12} />
                        </ActionIcon>
                    </Group>
                );
            })}
        </Stack>
    );

    // Inline mode: render groups directly without header/wrapper (used inside a group's children)
    if (inline && node.task_type === 'rotating') {
        if (isSingleGroup) {
            return (<>{renderGroupItems(groups[0], nextItemId)}{settingsDrawer}</>);
        }
        return (
            <>
            <Stack gap="xs">
                <Group justify="flex-end">
                    <ActionIcon variant="subtle" color="gray" size="xs"
                        onClick={() => setSettingsOpen(true)}
                        title="Configure priority groups"
                    >
                        <IconSettings size={14} />
                    </ActionIcon>
                </Group>
                {groups.map((group) => {
                    const isCurrentGroup = group.group_number === currentGroupNum;
                    const expanded = expandedGroups.has(group.group_number);
                    const hasChildren = group.children.length > 0;
                    return (
                        <Paper key={group.group_number} p="xs" radius="sm" withBorder={isCurrentGroup}
                            style={isCurrentGroup ? { borderColor: 'var(--polis-color-primary, var(--mantine-color-blue-3))' } : undefined}
                        >
                            <Group justify="space-between" wrap="nowrap"
                                style={{ cursor: hasChildren ? 'pointer' : undefined }}
                                onClick={hasChildren ? () => toggleGroupExpand(group.group_number) : undefined}
                            >
                                <Group gap="xs" wrap="nowrap">
                                    {hasChildren && <Text size="xs" c="dimmed">{expanded ? '▾' : '▸'}</Text>}
                                    <Badge size="sm" variant={isCurrentGroup ? 'filled' : 'light'}>
                                        #{group.group_number}
                                    </Badge>
                                    <Text size="sm" fw={isCurrentGroup ? 600 : 400}>{group.label}</Text>
                                </Group>
                                <Group gap="xs" wrap="nowrap">
                                    {editingGroupCount === group.group_number ? (
                                        <TextInput
                                            value={groupCountText}
                                            size="xs"
                                            w={70}
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                if (v === '' || v === '-' || /^-?\d+$/.test(v)) setGroupCountText(v);
                                            }}
                                            onBlur={() => {
                                                const parsed = parseInt(groupCountText, 10);
                                                if (!isNaN(parsed)) {
                                                    onUpdate(path, {
                                                        groups: groups.map((g) =>
                                                            g.group_number === group.group_number
                                                                ? { ...g, count_this_group: parsed }
                                                                : g
                                                        ),
                                                    });
                                                }
                                                setEditingGroupCount(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const parsed = parseInt(groupCountText, 10);
                                                    if (!isNaN(parsed)) {
                                                        onUpdate(path, {
                                                            groups: groups.map((g) =>
                                                                g.group_number === group.group_number
                                                                    ? { ...g, count_this_group: parsed }
                                                                    : g
                                                            ),
                                                        });
                                                    }
                                                    setEditingGroupCount(null);
                                                }
                                                if (e.key === 'Escape') setEditingGroupCount(null);
                                            }}
                                        />
                                    ) : (
                                        <Badge
                                            size="xs"
                                            variant="outline"
                                            color="gray"
                                            style={{ cursor: 'pointer' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setGroupCountText(String(group.count_this_group));
                                                setEditingGroupCount(group.group_number);
                                            }}
                                        >
                                            {group.count_this_group} THIS GROUP
                                        </Badge>
                                    )}
                                    {group.last_date && <Text size="xs" c="dimmed">{formatLastDate(group.last_date)}</Text>}
                                    {group.mark_done_on_group && (
                                        <ActionIcon variant="light" color="green" size="xs"
                                            onClick={(e) => { e.stopPropagation(); markGroupDone(group.group_number); }}
                                        >
                                            <IconCheck size={12} />
                                        </ActionIcon>
                                    )}
                                </Group>
                            </Group>
                            {hasChildren && expanded && (
                                <div style={{ paddingLeft: 8, paddingTop: 4 }}>
                                    {renderGroupItems(group, nextItemId)}
                                </div>
                            )}
                        </Paper>
                    );
                })}
            </Stack>
            {settingsDrawer}
            </>
        );
    }

    // Single group: render items directly under the main header (no group wrapper)
    if (isSingleGroup) {
        return (
            <Paper p={depth === 0 ? 'md' : 'xs'} radius={depth === 0 ? 'md' : 'sm'} withBorder>
                {collapsibleHeader}
                <Collapse in={!collapsed}>
                    {renderGroupItems(groups[0], nextItemId)}
                </Collapse>
                {settingsDrawer}
            </Paper>
        );
    }

    return (
        <Paper p={depth === 0 ? 'md' : 'xs'} radius={depth === 0 ? 'md' : 'sm'} withBorder>
            {collapsibleHeader}
            <Collapse in={!collapsed}>
                <Stack gap="sm">
                    {groups.map((group) => {
                        const isCurrent = group.group_number === currentGroupNum;

                        // Editable group count badge (shared)
                        const groupCountBadge = editingGroupCount === group.group_number ? (
                            <TextInput
                                value={groupCountText}
                                size="xs"
                                w={70}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === '' || v === '-' || /^-?\d+$/.test(v)) setGroupCountText(v);
                                }}
                                onBlur={() => {
                                    const parsed = parseInt(groupCountText, 10);
                                    if (!isNaN(parsed)) {
                                        onUpdate(path, {
                                            groups: groups.map((g) =>
                                                g.group_number === group.group_number
                                                    ? { ...g, count_this_group: parsed }
                                                    : g
                                            ),
                                        });
                                    }
                                    setEditingGroupCount(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const parsed = parseInt(groupCountText, 10);
                                        if (!isNaN(parsed)) {
                                            onUpdate(path, {
                                                groups: groups.map((g) =>
                                                    g.group_number === group.group_number
                                                        ? { ...g, count_this_group: parsed }
                                                        : g
                                                ),
                                            });
                                        }
                                        setEditingGroupCount(null);
                                    }
                                    if (e.key === 'Escape') setEditingGroupCount(null);
                                }}
                            />
                        ) : (
                            <Badge
                                variant="light"
                                size="xs"
                                color="gray"
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setGroupCountText(String(group.count_this_group));
                                    setEditingGroupCount(group.group_number);
                                }}
                            >
                                {group.count_this_group} this group
                            </Badge>
                        );

                        // Empty group or mark_done_on_group: render inline as direct target
                        const isEmptyGroup = group.children.length === 0;
                        if (isEmptyGroup || group.mark_done_on_group) {
                            return (
                                <Paper
                                    key={group.group_number}
                                    p="xs"
                                    radius="sm"
                                    withBorder
                                    style={{
                                        ...(isCurrent ? { borderColor: 'var(--polis-color-primary, var(--mantine-color-blue-5))', borderWidth: 2 } : {}),
                                        ...(isCurrent ? { backgroundColor: 'var(--polis-color-surface-alt, var(--mantine-color-blue-0))' } : {}),
                                    }}
                                >
                                    <Group gap="xs" wrap="nowrap">
                                        <Badge variant={isCurrent ? 'filled' : 'light'} size="sm">#{group.group_number}</Badge>
                                        <Text fw={500} size="sm" style={{ flex: 1 }}>{group.label ?? 'Priority'}</Text>
                                        {groupCountBadge}
                                        <Text size="xs" c="dimmed">{formatLastDate(group.last_date)}</Text>
                                        <ActionIcon
                                            variant="light"
                                            color="green"
                                            size="xs"
                                            onClick={(e) => { e.stopPropagation(); markGroupDone(group.group_number); }}
                                            title="Mark done"
                                        >
                                            <IconCheck size={12} />
                                        </ActionIcon>
                                    </Group>
                                </Paper>
                            );
                        }

                        // Multi-item group (or single-item group): expandable
                        return (
                            <Paper
                                key={group.group_number}
                                p="xs"
                                radius="sm"
                                withBorder
                                style={isCurrent ? { borderColor: 'var(--polis-color-primary, var(--mantine-color-blue-5))', borderWidth: 2 } : undefined}
                            >
                                <Group
                                    gap="xs"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => toggleGroupExpand(group.group_number)}
                                >
                                    {expandedGroups.has(group.group_number) ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                                    <Badge variant={isCurrent ? 'filled' : 'light'} size="sm">#{group.group_number}</Badge>
                                    <Text fw={500} size="sm" style={{ flex: 1 }}>{group.label ?? 'Priority'}</Text>
                                    {groupCountBadge}
                                </Group>
                                <Collapse in={expandedGroups.has(group.group_number)}>
                                    <div style={{ marginTop: 8, paddingLeft: 16 }}>
                                        {renderGroupItems(group, nextItemId)}
                                    </div>
                                </Collapse>
                            </Paper>
                        );
                    })}
                </Stack>
            </Collapse>
            {settingsDrawer}
        </Paper>
    );
};


export default TodoTaskNodeRenderer;
