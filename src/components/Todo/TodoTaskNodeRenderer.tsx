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
  IconPencil,
  IconTrash,
  IconPlus,
} from '@tabler/icons-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { TimerContext } from '../../contexts/TimerContext';
import { TodoContext } from '../../contexts/TodoContext';
import TodoTaskSettingsDrawer from './TodoTaskSettingsDrawer';
import DebouncedTextInput from './DebouncedTextInput';
import {
  TodoTaskNode,
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
  applyMarkDone,
  findNodeById,
  createEmptyNode,
  makeId,
  getTrackingMode,
} from './todoTaskUtils';

interface TodoTaskNodeRendererProps {
  node: TodoTaskNode;
  path: number[];
  componentId: number;
  onUpdate: (path: number[], patch: Partial<TodoTaskNode>) => void;
  onRemove?: (path: number[]) => void;
  depth?: number;
  siblingIndex?: number;
  /** When true, render inline inside a slot — skip the outer header/wrapper */
  inline?: boolean;
  /** Called when a mark-done happens inside an inline nested rotating: bubbles the slot path
   *  (relative to THIS node) up so the top-level rotating applies ONE applyMarkDone with the
   *  full path — every level's counts/cascade update in a single PATCH. */
  onInlineDone?: (innerSlotPath: string[], leafItemId?: string) => void;
  /** Inherited edit mode from parent */
  parentEditMode?: boolean;
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
  parentEditMode = false,
}) => {
  const {
    startTimer,
    stopTimer,
    isTracking,
    elapsedSeconds,
    activeTimer,
    registerOnStop,
    registerAfterStop,
    labelCurrentSession,
    resetSession,
  } = useContext(TimerContext);
  const { balances, balancesAsOf, refreshBalances, silentRefresh, currentPage } =
    useContext(TodoContext);

  // Past-day pages should render snapshot values (node.tally) — not the live balance.
  const pageConfig = currentPage?.config_json as Record<string, unknown> | undefined;
  const pageDate = pageConfig?.todo_date as string | undefined;
  const pageLevel = pageConfig?.todo_level as string | undefined;
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const isPastDay = pageLevel === 'day' && !!pageDate && pageDate < todayStr;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingTally, setEditingTally] = useState(false);
  const [tallyText, setTallyText] = useState('');
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceText, setBalanceText] = useState('');
  const [balanceTextDirty, setBalanceTextDirty] = useState(false);
  const [editingGroupCount, setEditingGroupCount] = useState<string | null>(null); // slot client_id
  const [groupCountText, setGroupCountText] = useState('');
  const [editingItemDate, setEditingItemDate] = useState<string | null>(null);
  const [editingGroupDate, setEditingGroupDate] = useState<string | null>(null); // slot client_id
  const [ownEditMode, setOwnEditMode] = useState(false);
  const [newChildText, setNewChildText] = useState('');
  const editMode = parentEditMode || ownEditMode;
  const isContainer = node.task_type === 'category' || node.task_type === 'rotating';

  const collapsed = node.collapsed ?? false;
  const isHoursMode = getTrackingMode(node) === 'hours';
  const schedStr = scheduleToString(node.schedule, node.calendar_rules);

  // For hours-mode nodes with a balance FK, use the authoritative balance — never the per-node
  // `tally` snapshot, which is written by multiple paths with inconsistent sign conventions.
  //  - Today's page: the live balance from the API.
  //  - Historical day pages: the balance "as of" that date, from the balance log (balancesAsOf).
  const balanceMap = React.useMemo(() => {
    if (isPastDay) {
      const m = new Map<number, number>();
      for (const [k, v] of Object.entries(balancesAsOf ?? {})) m.set(Number(k), Number(v));
      return m;
    }
    return buildBalanceMap(balances);
  }, [isPastDay, balances, balancesAsOf]);
  const apiBalance =
    isHoursMode && node.todo_balance_id ? balanceMap.get(node.todo_balance_id) : undefined;
  const tally = apiBalance !== undefined ? apiBalance : (node.tally ?? 0);

  const totals = computeTotals(node, undefined, balanceMap);
  const hasBudget = totals.totalBudgetHours > 0;

  // Timer
  const itemId = node.id;
  const tracking = isTracking(componentId, itemId);
  const hasTimeTracking =
    node.time_budget_hours !== undefined ||
    node.logged_hours !== undefined ||
    node.logged_time !== undefined;
  const nodeHasOwnTracking =
    isHoursMode || ((node.tally_step ?? 0) > 0 && (node.time_budget_hours ?? 0) > 0);
  const canTrack =
    (node.task_type !== 'category' || nodeHasOwnTracking) &&
    (isHoursMode || hasBudget || hasTimeTracking);
  const loggedHoursKey = node.task_type === 'rotating' ? 'logged_time' : 'logged_hours';
  const currentLogged = (node.task_type === 'rotating' ? node.logged_time : node.logged_hours) ?? 0;
  const isAccumulative = true; // Always accumulative — logged hours add up across sessions
  const computeNewLogged = (elapsed: number) => currentLogged + elapsed;

  useEffect(() => {
    if (tracking && canTrack) {
      registerOnStop(
        componentId,
        itemId,
        (elapsed) => {
          const patch: Partial<TodoTaskNode> = { [loggedHoursKey]: computeNewLogged(elapsed) };
          // Hours mode: subtract logged time from tally (the balance)
          // Still update node.tally for persistence, but display will use API balance
          if (isHoursMode) {
            patch.tally = tally - elapsed;
          }
          onUpdate(path, patch);
        },
        {
          sessionBudgetHours: isHoursMode ? 0 : node.time_budget_hours,
          preLoggedHours: isAccumulative ? currentLogged : 0,
          balanceHours: isHoursMode ? -tally : undefined,
          dailyTargetHours: isHoursMode ? (node.tally_step ?? 0) : undefined,
          todoBalanceId: node.todo_balance_id,
          budgetHours: isHoursMode ? 0 : totals.totalBudgetHours,
          onUpdateBalance: isHoursMode
            ? (newBalance: number) => {
                onUpdate(path, { tally: -newBalance });
              }
            : undefined,
        },
      );
      // After backend confirms stop, refresh balances and page data
      registerAfterStop(() => {
        refreshBalances();
        silentRefresh();
      });
    }
  }, [tracking, componentId, itemId, canTrack, currentLogged, isAccumulative, isHoursMode, tally]); // eslint-disable-line react-hooks/exhaustive-deps

  const liveBudget = totals.totalBudgetHours;

  // Rotating logic — slots are the node's direct children (priority_group / bare task / nested rotating)
  const slots = node.task_type === 'rotating' ? (node.children ?? []) : [];
  const deepNext = node.task_type === 'rotating' ? getDeepNextItem(node) : undefined;
  const currentSlotId = deepNext?.slotPath[0];
  const nextItemId = deepNext?.leafItemId;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(currentSlotId !== undefined ? [currentSlotId] : []),
  );
  // Auto-expand the focused slot when it changes
  useEffect(() => {
    if (currentSlotId !== undefined) {
      setExpandedGroups((prev) => {
        if (prev.has(currentSlotId)) return prev;
        const next = new Set(prev);
        next.add(currentSlotId);
        return next;
      });
    }
  }, [currentSlotId]);
  const toggleGroupExpand = (slotId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) {
        next.delete(slotId);
      } else {
        next.add(slotId);
      }
      return next;
    });
  };
  const shouldDecrement = node.decrement_on_done !== false; // default true

  /**
   * Unified mark-done for any slot path within this rotating node. Inline instances bubble the
   * path up to the top-level rotating (via onInlineDone) so ONE applyMarkDone runs with the
   * complete path and ONE PATCH is sent: children + tally decrement + logged reset + _mark_off
   * (which triggers the backend's atomic timer-split/session-complete/bank sequence).
   */
  const markDoneAt = (slotPath: string[], leafItemId?: string) => {
    if (inline && onInlineDone) {
      onInlineDone(slotPath, leafItemId);
      return;
    }

    if (tracking) {
      const leafId = leafItemId ?? slotPath[slotPath.length - 1];
      const found = findNodeById(node, leafId);
      if (found) labelCurrentSession(found.node.label);
      resetSession();
    }

    const updated = applyMarkDone(node, slotPath, leafItemId);
    const patch: Partial<TodoTaskNode> = {
      children: updated.children,
      logged_time: 0,
      logged_hours: 0,
      _mark_off: true,
    };
    if (shouldDecrement) {
      patch.tally = tally - 1;
    }
    onUpdate(path, patch);
  };

  // =========================================================================
  // UNIFORM HEADER — identical for all three types
  // Format: v  Label (budget schedule) (description)  X n  ........  Xh remaining  ▶  ⚙
  // =========================================================================
  // Formats a decimal-hour budget into a human phrase:
  //   1   -> "1 hour"
  //   0.25 -> "15 minutes"
  //   1.5 -> "1 hour and 30 minutes"
  //   1.25 -> "1 hour and 15 minutes"
  const formatBudgetPhrase = (hours: number): string => {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0 && m === 0) return '0 minutes';
    if (h === 0) return `${m} minute${m !== 1 ? 's' : ''}`;
    if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
    return `${h} hour${h !== 1 ? 's' : ''} and ${m} minute${m !== 1 ? 's' : ''}`;
  };

  const buildLabelText = () => {
    const prefix =
      node.task_type === 'category' && depth > 0 && siblingIndex !== undefined
        ? `${siblingIndex + 1}. `
        : '';

    let budgetPart = '';
    if (node.task_type === 'category') {
      const dailyBudget = computeDailyBudget(node);
      if (dailyBudget > 0) {
        budgetPart = ` (${formatBudgetPhrase(dailyBudget)}${schedStr ? ` ${schedStr}` : ''})`;
      }
    } else if (isHoursMode) {
      const hoursPerDay = node.tally_step ?? 0;
      if (hoursPerDay > 0) {
        budgetPart = ` (${formatBudgetPhrase(hoursPerDay)}${schedStr ? ` ${schedStr}` : ''})`;
      }
    } else {
      const perUnit = node.time_budget_hours ?? 0;
      if (perUnit > 0) {
        budgetPart = ` (${formatBudgetPhrase(perUnit)}${schedStr ? ` ${schedStr}` : ''})`;
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
  // Live-reflect the running session on this node AND its ancestors, matched by item_id (not
  // component_id) so it keeps working after the day rolls over mid-session.
  const trackedDescendant = React.useMemo(() => {
    const itemId = activeTimer?.target.itemId;
    if (!itemId) return null;
    const find = (n: TodoTaskNode): TodoTaskNode | null => {
      if (n.id === itemId) return n;
      for (const c of n.children ?? []) {
        const f = find(c);
        if (f) return f;
      }
      return null;
    };
    return find(node);
  }, [activeTimer, node]);

  // Live credit the running session grants THIS node's displayed value. For units/rotating
  // targets, (logged + live) is capped at the target's per-session allotment — computed from the
  // TARGET's own fields so ancestors apply the exact same cap as the leaf. (Previously ancestors
  // added live time uncapped, so a session running past its allotment made the parent keep
  // creeping, then snap back by the over-time when the item was stopped/marked off.)
  // Hours-mode targets have no per-session allotment; their live elapsed counts as-is.
  const liveCreditHours = React.useMemo(() => {
    if (!trackedDescendant) return 0;
    const live = elapsedSeconds / 3600;
    if (getTrackingMode(trackedDescendant) === 'hours') return live;
    const allot = trackedDescendant.time_budget_hours ?? 0;
    if (allot <= 0) return live;
    const logged =
      trackedDescendant.task_type === 'rotating'
        ? (trackedDescendant.logged_time ?? 0)
        : (trackedDescendant.logged_hours ?? 0);
    return Math.max(0, Math.min(logged + live, allot) - Math.min(logged, allot));
  }, [trackedDescendant, elapsedSeconds]);

  // Displayed value = budget/balance deficit + credited spent time + capped live credit.
  //   - Hours mode: the balance already reflects logged time, so only the live credit is added.
  //   - Units/rotating (leaf or category): totalSpentCredit is the per-node, per-mode capped
  //     logged credit from computeTotals (hours-mode children contribute 0 — their balance
  //     already includes logged time), so leaves and ancestors stay consistent by construction.
  const deficitVal = isHoursMode
    ? totals.totalDeficit + liveCreditHours
    : totals.totalDeficit + totals.totalSpentCredit + liveCreditHours;

  // Deficit/balance display (shown on all node types when non-zero)
  // Hours-mode leaf nodes: click to edit the balance (tally)
  const canEditBalance =
    isHoursMode && (node.task_type !== 'category' || nodeHasOwnTracking) && !isPastDay;
  const showDeficit = deficitVal !== 0 || nodeHasOwnTracking;
  const deficitDisplay =
    showDeficit &&
    (editingBalance && canEditBalance ? (
      <TextInput
        size="xs"
        w={80}
        value={balanceText}
        placeholder="H:MM"
        autoFocus
        onChange={(e) => {
          setBalanceText(e.target.value);
          setBalanceTextDirty(true);
        }}
        onBlur={() => {
          if (balanceTextDirty) {
            const val = parseHHMM(balanceText);
            if (!isNaN(val))
              onUpdate(path, { tally: -val, _manual_balance_edit: true } as Partial<TodoTaskNode>);
          }
          setEditingBalance(false);
          setBalanceTextDirty(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (balanceTextDirty) {
              const val = parseHHMM(balanceText);
              if (!isNaN(val))
                onUpdate(path, {
                  tally: -val,
                  _manual_balance_edit: true,
                } as Partial<TodoTaskNode>);
            }
            setEditingBalance(false);
            setBalanceTextDirty(false);
          } else if (e.key === 'Escape') {
            setEditingBalance(false);
            setBalanceTextDirty(false);
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
        onClick={
          canEditBalance
            ? (e) => {
                e.stopPropagation();
                setBalanceText(formatHoursHHMM(deficitVal));
                setBalanceTextDirty(false);
                setEditingBalance(true);
              }
            : undefined
        }
      >
        {deficitVal >= 0 ? '+' : ''}
        {formatHoursHHMM(deficitVal)}
      </Text>
    ));

  // Tally badge (shared between collapsible header and line item row)
  const isCategory = node.task_type === 'category';
  const tallyBadge =
    showTally &&
    (editingTally && !isCategory ? (
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
        onClick={
          isCategory
            ? undefined
            : (e) => {
                e.stopPropagation();
                setTallyText(String(tally));
                setEditingTally(true);
              }
        }
      >
        X {displayTally}
      </Badge>
    ));

  // Right-side controls (shared)
  // Categories only show deficit (children show their own remaining)
  // Hours mode always shows balance (via deficitDisplay), never "remaining"
  const showRemaining =
    !isHoursMode && hasBudget && node.task_type !== 'category' && !deficitDisplay;
  const rightControls = (
    <Group gap="xs" wrap="nowrap">
      {deficitDisplay}
      {showRemaining && (
        <Text size="xs" c={isOver ? 'red' : 'dimmed'} fw={isOver ? 600 : undefined}>
          {formatTimeRemaining(liveBudget, staticLogged)}
        </Text>
      )}
      {canTrack &&
        (tracking ? (
          <ActionIcon
            variant="filled"
            color="red"
            size="xs"
            onClick={stopTimer}
            title="Stop tracking"
          >
            <IconPlayerStop size={12} />
          </ActionIcon>
        ) : (
          <ActionIcon
            variant="light"
            color="blue"
            size="xs"
            onClick={() => {
              const onStop = (elapsed: number) => {
                const patch: Partial<TodoTaskNode> = {
                  [loggedHoursKey]: computeNewLogged(elapsed),
                };
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
                onUpdateBalance: isHoursMode
                  ? (newBalance: number) => {
                      onUpdate(path, { tally: -newBalance });
                    }
                  : undefined,
              });
            }}
            title="Start tracking"
          >
            <IconPlayerPlay size={12} />
          </ActionIcon>
        ))}
      <ActionIcon variant="light" size="sm" onClick={() => setSettingsOpen(true)} title="Settings">
        <IconSettings size={14} />
      </ActionIcon>
    </Group>
  );

  // Edit mode toggle button (pencil / check)
  const editToggle = isContainer && !parentEditMode && (
    <ActionIcon
      variant={ownEditMode ? 'filled' : 'light'}
      color={ownEditMode ? 'green' : 'gray'}
      size="sm"
      onClick={() => {
        // Submit pending "Add child" text before exiting edit mode
        if (ownEditMode && newChildText.trim() && node.task_type === 'category') {
          const child = createEmptyNode('line_item', newChildText.trim());
          onUpdate(path, { children: [...(node.children ?? []), child] });
          setNewChildText('');
        }
        setOwnEditMode(!ownEditMode);
      }}
      title={ownEditMode ? 'Done editing' : 'Edit tree'}
    >
      {ownEditMode ? <IconCheck size={14} /> : <IconPencil size={14} />}
    </ActionIcon>
  );

  // Trash button (shown in edit mode for non-root nodes)
  const trashButton = editMode && onRemove && depth > 0 && (
    <ActionIcon variant="light" color="red" size="sm" onClick={() => onRemove(path)} title="Remove">
      <IconTrash size={14} />
    </ActionIcon>
  );

  // Collapsible header for category/rotating (with chevron)
  const collapsibleHeader = (
    <Group justify="space-between" mb={collapsed ? 0 : 'sm'}>
      <Group
        gap="xs"
        style={{ cursor: 'pointer', flex: 1 }}
        onClick={() => !editMode && onUpdate(path, { collapsed: !collapsed })}
      >
        {collapsed && !editMode ? (
          <IconChevronRight size={16} />
        ) : !editMode ? (
          <IconChevronDown size={16} />
        ) : null}
        {editMode ? (
          <DebouncedTextInput
            value={node.label}
            size={depth === 0 ? 'sm' : 'xs'}
            style={{ flex: 1 }}
            styles={{ input: { fontWeight: 600 } }}
            onClick={(e) => e.stopPropagation()}
            onCommit={(val) => onUpdate(path, { label: val })}
          />
        ) : (
          <>
            <Text fw={600} size={depth === 0 ? 'md' : 'sm'}>
              {labelText}
            </Text>
            {tallyBadge}
          </>
        )}
      </Group>
      <Group gap="xs" wrap="nowrap">
        {!editMode && node.show_checkmark && (
          <Popover
            opened={editingItemDate === node.id}
            onChange={(o) => {
              if (!o) setEditingItemDate(null);
            }}
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
                  setEditingItemDate(node.id);
                }}
              >
                {formatLastDate(node.last_date)}
              </Text>
            </Popover.Target>
            <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
              <DatePicker
                value={(() => {
                  if (!node.last_date) return null;
                  if (node.last_date.includes('T')) {
                    const d = new Date(node.last_date);
                    return isNaN(d.getTime()) ? null : d;
                  }
                  return null;
                })()}
                onChange={(date) => {
                  onUpdate(path, { last_date: date ? date.toISOString() : undefined });
                  setEditingItemDate(null);
                }}
              />
            </Popover.Dropdown>
          </Popover>
        )}
        {!editMode && node.show_checkmark && (
          <ActionIcon
            variant="light"
            color="green"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(path, { last_date: new Date().toISOString() });
            }}
            title="Mark done"
          >
            <IconCheck size={12} />
          </ActionIcon>
        )}
        {!editMode && rightControls}
        {editToggle}
        {trashButton}
        {editMode && (
          <ActionIcon
            variant="light"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            <IconSettings size={14} />
          </ActionIcon>
        )}
      </Group>
    </Group>
  );

  const settingsDrawer = (
    <TodoTaskSettingsDrawer
      node={node}
      opened={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      onUpdate={(patch) => onUpdate(path, patch)}
      onRemove={
        onRemove
          ? () => {
              onRemove(path);
              setSettingsOpen(false);
            }
          : undefined
      }
    />
  );

  // =========================================================================
  // BODY — differs by type
  // =========================================================================

  // LINE ITEM: flat row, no Paper, no collapse, no chevron
  // Format: Label (budget) X n ............ ✓ Xh remaining ▶ ⚙
  if (node.task_type === 'line_item') {
    // Checkmark/date: show by default when no time tracking, override with show_checkmark
    const showCheckmark = node.show_checkmark !== undefined ? node.show_checkmark : !canTrack;

    const markLineDone = () => {
      if (tracking) labelCurrentSession(node.label);
      const patch: Partial<TodoTaskNode> = { last_date: new Date().toISOString() };
      if (shouldDecrement) {
        patch.tally = tally - 1;
      }
      onUpdate(path, patch);
    };

    const lineItemContent = (dropStyle?: React.CSSProperties) => (
      <Stack gap={2} style={dropStyle}>
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" style={{ flex: 1 }}>
            {editMode ? (
              <DebouncedTextInput
                value={node.label}
                size="xs"
                style={{ flex: 1 }}
                styles={{ input: { fontWeight: 600 } }}
                onCommit={(val) => onUpdate(path, { label: val })}
              />
            ) : (
              <>
                <Text fw={600} size="sm">
                  {labelText}
                </Text>
                {tallyBadge}
              </>
            )}
          </Group>
          <Group gap="xs" wrap="nowrap">
            {!editMode && deficitDisplay}
            {!editMode && !isHoursMode && !deficitDisplay && hasBudget && (
              <Text size="xs" c={isOver ? 'red' : 'dimmed'} fw={isOver ? 600 : undefined}>
                {formatTimeRemaining(liveBudget, currentLogged)}
              </Text>
            )}
            {!editMode &&
              canTrack &&
              (tracking ? (
                <ActionIcon
                  variant="filled"
                  color="red"
                  size="xs"
                  onClick={stopTimer}
                  title="Stop tracking"
                >
                  <IconPlayerStop size={12} />
                </ActionIcon>
              ) : (
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="xs"
                  onClick={() => {
                    const onStop = (elapsed: number) => {
                      const patch: Partial<TodoTaskNode> = {
                        [loggedHoursKey]: computeNewLogged(elapsed),
                      };
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
                      onUpdateBalance: isHoursMode
                        ? (newBalance: number) => {
                            onUpdate(path, { tally: -newBalance });
                          }
                        : undefined,
                    });
                  }}
                  title="Start tracking"
                >
                  <IconPlayerPlay size={12} />
                </ActionIcon>
              ))}
            {!editMode && showCheckmark && (
              <Popover
                opened={editingItemDate === node.id}
                onChange={(o) => {
                  if (!o) setEditingItemDate(null);
                }}
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
                      setEditingItemDate(node.id);
                    }}
                  >
                    {formatLastDate(node.last_date)}
                  </Text>
                </Popover.Target>
                <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
                  <DatePicker
                    value={(() => {
                      if (!node.last_date) return null;
                      if (node.last_date.includes('T')) {
                        const d = new Date(node.last_date);
                        return isNaN(d.getTime()) ? null : d;
                      }
                      const parts = node.last_date.split('-');
                      if (parts.length !== 2) return null;
                      const now = new Date();
                      return new Date(
                        now.getFullYear(),
                        parseInt(parts[0], 10) - 1,
                        parseInt(parts[1], 10),
                      );
                    })()}
                    onChange={(date) => {
                      onUpdate(path, { last_date: date ? date.toISOString() : undefined });
                      setEditingItemDate(null);
                    }}
                  />
                </Popover.Dropdown>
              </Popover>
            )}
            {!editMode && showCheckmark && (
              <ActionIcon
                variant="light"
                color="green"
                size="xs"
                onClick={markLineDone}
                title="Mark done"
              >
                <IconCheck size={12} />
              </ActionIcon>
            )}
            {!editMode && (
              <ActionIcon
                variant="light"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                title="Settings"
              >
                <IconSettings size={14} />
              </ActionIcon>
            )}
            {editMode && onRemove && (
              <ActionIcon
                variant="light"
                color="red"
                size="sm"
                onClick={() => onRemove(path)}
                title="Remove"
              >
                <IconTrash size={14} />
              </ActionIcon>
            )}
          </Group>
        </Group>
        {node.sub_items && node.sub_items.length > 0 && (
          // todo-dnd-compact: hidden while a tree drag is active (see PageRenderer
          // onBeforeCapture) so tall rows measure small — big sub-item blocks create
          // huge combine dead-zones and lurching placeholders otherwise.
          <Stack gap={0} pl="lg" className="todo-dnd-compact">
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

    return lineItemContent();
  }

  // CATEGORY body: children + "Add item..." input
  if (node.task_type === 'category') {
    const children = node.children ?? [];
    const droppableId = `comp:${componentId}:drop:${path.join('.')}`;
    return (
      <Paper p={depth === 0 ? 'md' : 'xs'} radius={depth === 0 ? 'md' : 'sm'} withBorder>
        {collapsibleHeader}
        <Collapse in={!collapsed}>
          <Droppable
            droppableId={droppableId}
            type="TODO_NODE"
            isCombineEnabled
            // Portal the drag clone to <body>: ancestor transforms (page-component
            // Draggable wrappers, Mantine transitions) turn position:fixed into a
            // containing-block trap, drifting the clone away from the cursor during
            // auto-scroll. A compact pill also beats dragging a full expanded card.
            getContainerForClone={() => document.body}
            renderClone={(cloneProvided, _cloneSnapshot, rubric) => {
              const dragged = children[rubric.source.index];
              return (
                <div
                  ref={cloneProvided.innerRef}
                  {...cloneProvided.draggableProps}
                  {...cloneProvided.dragHandleProps}
                >
                  <Paper p="xs" radius="sm" withBorder shadow="lg" bg="white">
                    <Group gap="xs" wrap="nowrap">
                      <IconGripVertical
                        size={14}
                        color="var(--polis-color-text-muted, var(--mantine-color-gray-5))"
                      />
                      <Text fw={600} size="sm">
                        {dragged?.label ?? ''}
                      </Text>
                    </Group>
                  </Paper>
                </div>
              );
            }}
          >
            {(provided, snapshot) => (
              <Stack
                gap="xs"
                pl={depth > 0 ? 'xs' : 0}
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  minHeight: 24,
                  transition: 'background-color 0.15s',
                  ...(snapshot.isDraggingOver
                    ? {
                        backgroundColor:
                          'var(--polis-color-surface-alt, var(--mantine-color-blue-0))',
                        borderRadius: 4,
                        outline:
                          '2px dashed var(--polis-color-primary, var(--mantine-color-blue-4))',
                        outlineOffset: 2,
                      }
                    : {}),
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
                          ...(dragSnapshot.isDragging
                            ? {
                                opacity: 0.9,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                backgroundColor: '#fff',
                                borderRadius: 4,
                              }
                            : {}),
                        }}
                      >
                        <Group gap={4} wrap="nowrap" align="flex-start">
                          <div
                            {...dragProvided.dragHandleProps}
                            style={{
                              cursor: 'grab',
                              padding: '8px 4px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              alignSelf: 'stretch',
                              minWidth: 20,
                            }}
                          >
                            <IconGripVertical
                              size={16}
                              color="var(--polis-color-text-muted, var(--mantine-color-gray-5))"
                            />
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
                              parentEditMode={editMode}
                            />
                          </div>
                        </Group>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {editMode && (
                  <Group gap="xs" pl={depth > 0 ? 'xs' : 0}>
                    <TextInput
                      placeholder="Add child..."
                      size="xs"
                      style={{ flex: 1 }}
                      value={newChildText}
                      onChange={(e) => setNewChildText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newChildText.trim()) {
                          const child = createEmptyNode('line_item', newChildText.trim());
                          onUpdate(path, { children: [...(node.children ?? []), child] });
                          setNewChildText('');
                        }
                      }}
                    />
                    <ActionIcon
                      variant="light"
                      size="xs"
                      onClick={() => {
                        if (!newChildText.trim()) return;
                        const child = createEmptyNode('line_item', newChildText.trim());
                        onUpdate(path, { children: [...(node.children ?? []), child] });
                        setNewChildText('');
                      }}
                    >
                      <IconPlus size={12} />
                    </ActionIcon>
                  </Group>
                )}
              </Stack>
            )}
          </Droppable>
        </Collapse>
        {settingsDrawer}
      </Paper>
    );
  }

  // =========================================================================
  // ROTATING body: slots (the node's direct children)
  //  - priority_group slot  → expandable box with its item list
  //  - bare task slot / show_checkmark group → direct completion target row
  //  - nested rotating slot → recursive inline render inside slot chrome
  // Mark-done bubbles the slot path to the top rotating instance, which sends
  // ONE children patch flagged _mark_off (applyMarkDone handles all levels).
  // =========================================================================
  const isSingleGroupSlot =
    slots.length === 1 && slots[0].task_type === 'priority_group' && !slots[0].show_checkmark;

  const slotIndexOf = (slot: TodoTaskNode) => slots.findIndex((s) => s.id === slot.id);

  // Editable "N THIS GROUP" badge — patches the slot node directly (real path)
  const slotCountBadge = (slot: TodoTaskNode, small = false) =>
    editingGroupCount === slot.id ? (
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
          if (!isNaN(parsed)) onUpdate([...path, slotIndexOf(slot)], { count_this_group: parsed });
          setEditingGroupCount(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const parsed = parseInt(groupCountText, 10);
            if (!isNaN(parsed))
              onUpdate([...path, slotIndexOf(slot)], { count_this_group: parsed });
            setEditingGroupCount(null);
          }
          if (e.key === 'Escape') setEditingGroupCount(null);
        }}
      />
    ) : (
      <Badge
        size="xs"
        variant={small ? 'outline' : 'light'}
        color="gray"
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          setGroupCountText(String(slot.count_this_group ?? 0));
          setEditingGroupCount(slot.id);
        }}
      >
        {slot.count_this_group ?? 0} THIS GROUP
      </Badge>
    );

  // Slot last-done date with picker — patches the slot node directly
  const slotDatePopover = (slot: TodoTaskNode) => (
    <Popover
      opened={editingGroupDate === slot.id}
      onChange={(o) => {
        if (!o) setEditingGroupDate(null);
      }}
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
            setEditingGroupDate(slot.id);
          }}
        >
          {formatLastDate(slot.last_date)}
        </Text>
      </Popover.Target>
      <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
        <DatePicker
          value={(() => {
            if (!slot.last_date) return null;
            if (slot.last_date.includes('T')) {
              const d = new Date(slot.last_date);
              return isNaN(d.getTime()) ? null : d;
            }
            const parts = slot.last_date.split('-');
            if (parts.length !== 2) return null;
            const now = new Date();
            return new Date(now.getFullYear(), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
          })()}
          onChange={(date) => {
            onUpdate([...path, slotIndexOf(slot)], {
              last_date: date ? date.toISOString() : undefined,
            });
            setEditingGroupDate(null);
          }}
        />
      </Popover.Dropdown>
    </Popover>
  );

  // Items of a priority_group slot
  const renderSlotItems = (slot: TodoTaskNode, activeItemId?: string) => {
    const slotIdx = slotIndexOf(slot);
    const items = slot.children ?? [];
    return (
      <Stack gap="xs">
        {items.map((item, idx) => {
          // Container items (e.g. a rotating "Watch Group" inside a priority group)
          // render recursively with their REAL path; mark-done bubbles through us.
          if (item.task_type !== 'line_item') {
            return (
              <TodoTaskNodeRenderer
                key={item.id}
                node={item}
                path={[...path, slotIdx, idx]}
                componentId={componentId}
                onUpdate={onUpdate}
                onRemove={onRemove}
                depth={depth + 1}
                siblingIndex={idx}
                inline
                onInlineDone={(innerPath, leaf) =>
                  markDoneAt([slot.id, item.id, ...innerPath], leaf)
                }
                parentEditMode={editMode}
              />
            );
          }

          const isNextToDo = item.id === activeItemId;
          return (
            <Group
              key={item.id}
              gap="xs"
              wrap="nowrap"
              style={
                isNextToDo
                  ? {
                      backgroundColor:
                        'var(--polis-color-surface-alt, var(--mantine-color-blue-0))',
                      borderRadius: 4,
                      padding: '2px 4px',
                      margin: '-2px -4px',
                    }
                  : undefined
              }
            >
              <Text size="xs" c="dimmed" w={16} ta="right">
                {idx + 1}.
              </Text>
              {editMode ? (
                <DebouncedTextInput
                  value={item.label}
                  size="xs"
                  style={{ flex: 1 }}
                  onCommit={(val) => onUpdate([...path, slotIdx, idx], { label: val })}
                />
              ) : (
                <Text size="sm" style={{ flex: 1 }}>
                  {item.label}
                </Text>
              )}
              {editMode && (
                <ActionIcon
                  variant="light"
                  color="red"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate([...path, slotIdx], {
                      children: items.filter((c) => c.id !== item.id),
                    });
                  }}
                  title="Remove"
                >
                  <IconTrash size={12} />
                </ActionIcon>
              )}
              {!editMode && (
                <Popover
                  opened={editingItemDate === item.id}
                  onChange={(o) => {
                    if (!o) setEditingItemDate(null);
                  }}
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
                        return new Date(
                          now.getFullYear(),
                          parseInt(parts[0], 10) - 1,
                          parseInt(parts[1], 10),
                        );
                      })()}
                      onChange={(date) => {
                        onUpdate([...path, slotIdx, idx], {
                          last_date: date ? date.toISOString() : undefined,
                        });
                        setEditingItemDate(null);
                      }}
                    />
                  </Popover.Dropdown>
                </Popover>
              )}
              {!editMode && (
                <ActionIcon
                  variant="light"
                  color="green"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    markDoneAt([slot.id], item.id);
                  }}
                  title="Mark done"
                >
                  <IconCheck size={12} />
                </ActionIcon>
              )}
            </Group>
          );
        })}
        {editMode && (
          <Group gap="xs">
            <Text size="xs" c="dimmed" w={16} />
            <TextInput
              placeholder="Add item..."
              size="xs"
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                  const label = (e.target as HTMLInputElement).value.trim();
                  const newItem: TodoTaskNode = {
                    id: makeId('ri'),
                    task_type: 'line_item',
                    label,
                    on_copy: 'preserve',
                  };
                  onUpdate([...path, slotIdx], { children: [...items, newItem] });
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </Group>
        )}
      </Stack>
    );
  };

  // One slot box with chrome (position badge, label, count, date, focus ring)
  const renderSlotBox = (slot: TodoTaskNode, slotIdx: number, compact = false) => {
    const isCurrent = slot.id === currentSlotId;
    const expanded = expandedGroups.has(slot.id);

    // Direct completion target: bare task slot, empty group, or a group marked done as a whole
    const isDirectTarget =
      slot.task_type !== 'rotating' &&
      (slot.task_type !== 'priority_group' ||
        (slot.children?.length ?? 0) === 0 ||
        slot.show_checkmark);

    if (isDirectTarget) {
      return (
        <Paper
          key={slot.id}
          p="xs"
          radius="sm"
          withBorder
          style={{
            ...(isCurrent
              ? {
                  borderColor: 'var(--polis-color-primary, var(--mantine-color-blue-5))',
                  borderWidth: 2,
                }
              : {}),
            ...(isCurrent && !compact
              ? { backgroundColor: 'var(--polis-color-surface-alt, var(--mantine-color-blue-0))' }
              : {}),
          }}
        >
          <Group gap="xs" wrap="nowrap">
            <Badge variant={isCurrent ? 'filled' : 'light'} size="sm">
              #{slotIdx + 1}
            </Badge>
            {editMode ? (
              <DebouncedTextInput
                value={slot.label}
                size="xs"
                style={{ flex: 1 }}
                onCommit={(val) => onUpdate([...path, slotIdx], { label: val })}
              />
            ) : (
              <Text fw={500} size="sm" style={{ flex: 1 }}>
                {slot.label || 'Priority'}
              </Text>
            )}
            {slotCountBadge(slot, compact)}
            {slotDatePopover(slot)}
            <ActionIcon
              variant="light"
              color="green"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                markDoneAt([slot.id]);
              }}
              title="Mark done"
            >
              <IconCheck size={12} />
            </ActionIcon>
          </Group>
        </Paper>
      );
    }

    // Nested rotating slot: chrome + recursive inline render of its own slots
    if (slot.task_type === 'rotating') {
      return (
        <Paper
          key={slot.id}
          p="xs"
          radius="sm"
          withBorder
          style={
            isCurrent
              ? {
                  borderColor: 'var(--polis-color-primary, var(--mantine-color-blue-5))',
                  borderWidth: 2,
                }
              : undefined
          }
        >
          <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => toggleGroupExpand(slot.id)}>
            {expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
            <Badge variant={isCurrent ? 'filled' : 'light'} size="sm">
              #{slotIdx + 1}
            </Badge>
            <Text fw={500} size="sm" style={{ flex: 1 }}>
              {slot.label}
            </Text>
            {slotCountBadge(slot)}
          </Group>
          <Collapse in={expanded}>
            <div style={{ marginTop: 8, paddingLeft: 16 }}>
              <TodoTaskNodeRenderer
                node={slot}
                path={[...path, slotIdx]}
                componentId={componentId}
                onUpdate={onUpdate}
                onRemove={onRemove}
                depth={depth + 1}
                siblingIndex={slotIdx}
                inline
                onInlineDone={(innerPath, leaf) => markDoneAt([slot.id, ...innerPath], leaf)}
                parentEditMode={editMode}
              />
            </div>
          </Collapse>
        </Paper>
      );
    }

    // Priority group with items: expandable
    return (
      <Paper
        key={slot.id}
        p="xs"
        radius="sm"
        withBorder
        style={
          isCurrent
            ? {
                borderColor: 'var(--polis-color-primary, var(--mantine-color-blue-5))',
                borderWidth: 2,
              }
            : undefined
        }
      >
        <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => toggleGroupExpand(slot.id)}>
          {expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          <Badge variant={isCurrent ? 'filled' : 'light'} size="sm">
            #{slotIdx + 1}
          </Badge>
          <Text fw={500} size="sm" style={{ flex: 1 }}>
            {slot.label || 'Priority'}
          </Text>
          {slotCountBadge(slot)}
        </Group>
        <Collapse in={expanded}>
          <div style={{ marginTop: 8, paddingLeft: 16 }}>{renderSlotItems(slot, nextItemId)}</div>
        </Collapse>
      </Paper>
    );
  };

  // Inline mode: render slots directly without header/wrapper (used inside a parent slot)
  if (inline && node.task_type === 'rotating') {
    if (isSingleGroupSlot) {
      return (
        <>
          {renderSlotItems(slots[0], nextItemId)}
          {settingsDrawer}
        </>
      );
    }
    return (
      <>
        <Stack gap="xs">
          <Group justify="flex-end">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => setSettingsOpen(true)}
              title="Configure priority groups"
            >
              <IconSettings size={14} />
            </ActionIcon>
          </Group>
          {slots.map((slot, idx) => renderSlotBox(slot, idx, true))}
        </Stack>
        {settingsDrawer}
      </>
    );
  }

  // Single priority group: render its items directly under the main header (no slot wrapper)
  if (isSingleGroupSlot) {
    return (
      <Paper p={depth === 0 ? 'md' : 'xs'} radius={depth === 0 ? 'md' : 'sm'} withBorder>
        {collapsibleHeader}
        <Collapse in={!collapsed}>{renderSlotItems(slots[0], nextItemId)}</Collapse>
        {settingsDrawer}
      </Paper>
    );
  }

  return (
    <Paper p={depth === 0 ? 'md' : 'xs'} radius={depth === 0 ? 'md' : 'sm'} withBorder>
      {collapsibleHeader}
      <Collapse in={!collapsed}>
        <Stack gap="sm">{slots.map((slot, idx) => renderSlotBox(slot, idx))}</Stack>
      </Collapse>
      {settingsDrawer}
    </Paper>
  );
};

export default TodoTaskNodeRenderer;
