import React, { useContext, useState } from 'react';
import {
  Paper,
  Text,
  Group,
  ActionIcon,
  Progress,
  Transition,
  TextInput,
  Stack,
  ScrollArea,
  Menu,
  Modal,
  Autocomplete,
  Button,
} from '@mantine/core';
import {
  IconPlayerStop,
  IconCheck,
  IconSettings,
  IconArrowsHorizontal,
  IconExchange,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getTimeEntries, updateRunningTimer } from '../../services/requests/TodoRequests';
import { TimerContext, TimerSession } from '../../contexts/TimerContext';
import { MeContext } from '../../contexts/MeContext';
import { TodoContext } from '../../contexts/TodoContext';

function formatTime(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const sign = totalSeconds < 0 ? '-' : '';
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatClockTime(epochMs: number, use24h: boolean): string {
  const d = new Date(epochMs);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  if (use24h) return `${String(h).padStart(2, '0')}:${m}`;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

const SessionRow: React.FC<{
  session: TimerSession;
  sessionBudgetSeconds: number;
  sessionSeconds: number;
}> = ({ session, sessionBudgetSeconds, sessionSeconds }) => {
  return (
    <Stack gap={2}>
      <Group justify="space-between">
        <Group gap={4}>
          {session.completed && (
            <IconCheck size={12} color="var(--polis-color-success, var(--mantine-color-green-6))" />
          )}
          <Text
            size="xs"
            fw={session.completed ? 500 : 400}
            c={session.completed ? undefined : 'dimmed'}
          >
            {session.label}
          </Text>
        </Group>
        <Text
          size="xs"
          c={session.completed ? 'green' : 'dimmed'}
          fw={session.completed ? 600 : undefined}
        >
          {formatTime(sessionSeconds)} / {formatTime(sessionBudgetSeconds)}
        </Text>
      </Group>
      <Progress
        value={session.progressPct}
        color={session.completed ? 'green' : 'blue'}
        size="sm"
        radius="xl"
      />
    </Stack>
  );
};

const FloatingTimer: React.FC = () => {
  const { activeTimer, elapsedSeconds, sessionSeconds, sessions, stopTimer, updateStartTime } =
    useContext(TimerContext);
  const { me } = useContext(MeContext);
  const use24h = me.time_format === '24h';
  const [editingStart, setEditingStart] = useState(false);
  const [startText, setStartText] = useState('');

  const [taskChangeOpen, setTaskChangeOpen] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [recentLabels, setRecentLabels] = useState<string[]>([]);
  const { currentPage } = useContext(TodoContext);

  const useLastEndAsStart = async () => {
    if (!me?.id || !activeTimer) return;
    try {
      const today = new Date();
      const to = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const fromDate = new Date(today.getTime() - 7 * 86400000);
      const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`;
      const res = await getTimeEntries(me.id, from, to, 100);
      const entries = res.data.data;
      // Find the most recent stopped entry (any task) before the current timer's start
      const currentStart = activeTimer.startTime;
      const candidates = entries
        .filter((e) => e.stopped_at)
        .filter((e) => new Date(e.stopped_at!).getTime() < currentStart)
        .sort((a, b) => new Date(b.stopped_at!).getTime() - new Date(a.stopped_at!).getTime());
      const last = candidates[0];
      if (last?.stopped_at) {
        const ts = new Date(last.stopped_at).getTime();
        updateStartTime(ts);
        notifications.show({
          message: `Start time set to ${new Date(ts).toLocaleTimeString()}`,
          color: 'blue',
          autoClose: 2500,
        });
      } else {
        notifications.show({ message: 'No prior entry found', color: 'gray', autoClose: 2500 });
      }
    } catch (e) {
      console.error('Failed to find last end time', e);
      notifications.show({ title: 'Error', message: 'Failed to load entries', color: 'red' });
    }
  };

  const openTaskChange = () => {
    if (!activeTimer) return;
    // Collect labels from current page components + recent entries
    const labels = new Set<string>();
    if (currentPage?.components) {
      const walk = (n: Record<string, unknown>, parentLabel?: string) => {
        const type = n.task_type as string;
        const lbl = n.label as string;
        if (type === 'category') {
          const children = (n.children as Record<string, unknown>[]) ?? [];
          children.forEach((c) => walk(c, lbl));
        } else if (lbl) {
          labels.add(parentLabel ? `${parentLabel} — ${lbl}` : lbl);
        }
      };
      for (const comp of currentPage.components) {
        if (comp.component_type === 'todo_task') {
          const config = comp.config_json as Record<string, unknown>;
          if (config?.root) walk(config.root as Record<string, unknown>);
        }
      }
    }
    setRecentLabels([...labels].sort());
    setNewTaskLabel(activeTimer.target.label);
    setTaskChangeOpen(true);
  };

  const submitTaskChange = async () => {
    if (!me?.id || !newTaskLabel.trim()) return;
    try {
      await updateRunningTimer(me.id, { label: newTaskLabel.trim() });
      notifications.show({ message: 'Task updated', color: 'green', autoClose: 2000 });
      setTaskChangeOpen(false);
    } catch (e) {
      console.error('Failed to change task', e);
      notifications.show({ title: 'Error', message: 'Failed to update task', color: 'red' });
    }
  };

  const isActive = !!activeTimer;
  const sessionBudgetHours = activeTimer?.target.sessionBudgetHours ?? 0;
  const sessionBudgetSeconds = sessionBudgetHours * 3600;
  const budgetHours = activeTimer?.target.budgetHours ?? 0;
  const hasSessions = sessions.length > 0 && sessionBudgetSeconds > 0;

  // Balance bar for hours-mode tasks (balanceHours is only set for hours-mode)
  const balanceHours = activeTimer?.target.balanceHours;
  const hasBalance = balanceHours != null;
  const elapsedHours = elapsedSeconds / 3600;
  const effectiveBalanceHours = hasBalance ? balanceHours! + elapsedHours : 0;
  const isBehind = hasBalance && effectiveBalanceHours < 0;
  const isAhead = hasBalance && effectiveBalanceHours >= 0;
  const deficitSeconds =
    hasBalance && balanceHours! < 0 ? Math.round(Math.abs(balanceHours!) * 3600) : 0;
  const balancePct =
    deficitSeconds > 0 ? Math.min((elapsedSeconds / deficitSeconds) * 100, 100) : isAhead ? 100 : 0;
  const balanceRemainingSeconds = Math.round(Math.abs(effectiveBalanceHours) * 3600);

  // Units-mode total budget balance — only counts current session (capped at session budget)
  // Hide the total budget bar when it would show the same values as the session bar
  const sessionMatchesTotal =
    sessionBudgetSeconds > 0 && sessionBudgetSeconds === budgetHours * 3600;
  const hasUnitsBudget = !hasBalance && budgetHours > 0 && !sessionMatchesTotal;
  const totalBudgetSeconds = budgetHours * 3600;
  const cappedSessionSeconds =
    sessionBudgetSeconds > 0 ? Math.min(sessionSeconds, sessionBudgetSeconds) : sessionSeconds;
  const totalRemaining = totalBudgetSeconds - cappedSessionSeconds;
  const totalOver = totalRemaining <= 0;
  const totalPct =
    totalBudgetSeconds > 0 ? Math.min((cappedSessionSeconds / totalBudgetSeconds) * 100, 100) : 0;

  const commitStartTime = () => {
    if (!activeTimer) {
      setEditingStart(false);
      return;
    }
    const text = startText.trim();
    const match24 = text.match(/^(\d{1,2}):(\d{2})$/);
    const match12 = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    let hours: number | null = null;
    let minutes: number | null = null;
    if (match24) {
      hours = parseInt(match24[1], 10);
      minutes = parseInt(match24[2], 10);
    } else if (match12) {
      hours = parseInt(match12[1], 10);
      minutes = parseInt(match12[2], 10);
      const isPM = match12[3].toUpperCase() === 'PM';
      if (hours === 12) hours = isPM ? 12 : 0;
      else if (isPM) hours += 12;
    }
    if (
      hours != null &&
      minutes != null &&
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59
    ) {
      const d = new Date(activeTimer.startTime);
      d.setHours(hours, minutes, 0, 0);
      const newStart = Math.min(d.getTime(), Date.now());
      updateStartTime(newStart);
    }
    setEditingStart(false);
  };

  const hasAnyBar = hasSessions || hasBalance || hasUnitsBudget;

  return (
    <>
      <Transition mounted={isActive} transition="slide-up" duration={200}>
        {(styles) => (
          <Paper
            shadow="lg"
            p="md"
            radius="md"
            withBorder
            style={{
              ...styles,
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
              minWidth: 300,
              maxWidth: 360,
            }}
          >
            <Group justify="space-between" mb="xs">
              <Text fw={600} size="sm" lineClamp={1} style={{ maxWidth: 220 }}>
                {activeTimer?.target.label}
              </Text>
              <Group gap="xs" wrap="nowrap">
                <Menu shadow="md" width={220} position="bottom-end" withinPortal zIndex={1100}>
                  <Menu.Target>
                    <ActionIcon variant="light" size="sm" title="Timer options">
                      <IconSettings size={14} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconArrowsHorizontal size={14} />}
                      onClick={useLastEndAsStart}
                    >
                      Start at last end time
                    </Menu.Item>
                    <Menu.Item leftSection={<IconExchange size={14} />} onClick={openTaskChange}>
                      Change task
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                <ActionIcon
                  variant="filled"
                  color="red"
                  size="sm"
                  onClick={stopTimer}
                  title="Stop timer"
                >
                  <IconPlayerStop size={14} />
                </ActionIcon>
              </Group>
            </Group>
            <Group justify="space-between" mb={hasAnyBar ? 'xs' : 0}>
              <Text size="xs" c="dimmed">
                Elapsed:{' '}
                <Text span fw={600}>
                  {formatTime(elapsedSeconds)}
                </Text>
              </Text>
              <Group gap={4} wrap="nowrap" align="center">
                <Text size="xs" c="dimmed">
                  Started:
                </Text>
                {editingStart ? (
                  <TextInput
                    value={startText}
                    size="xs"
                    w={use24h ? 70 : 100}
                    autoFocus
                    placeholder={use24h ? 'HH:MM' : 'H:MM AM'}
                    styles={{
                      input: {
                        textAlign: 'center',
                        padding: '0 4px',
                        fontSize: 'var(--mantine-font-size-xs)',
                      },
                    }}
                    onChange={(e) => setStartText(e.target.value)}
                    onBlur={commitStartTime}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitStartTime();
                      if (e.key === 'Escape') setEditingStart(false);
                    }}
                  />
                ) : (
                  <Text
                    size="xs"
                    fw={600}
                    style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                    onClick={() => {
                      if (activeTimer) {
                        setStartText(formatClockTime(activeTimer.startTime, use24h));
                        setEditingStart(true);
                      }
                    }}
                    title="Click to edit start time"
                  >
                    {activeTimer ? formatClockTime(activeTimer.startTime, use24h) : '--:--'}
                  </Text>
                )}
              </Group>
            </Group>

            {/* Balance progress bar for hours-mode tasks */}
            {hasBalance && (
              <Stack gap={4} mb={hasSessions ? 'xs' : 0}>
                <Group justify="space-between">
                  {isBehind ? (
                    <>
                      <Text size="xs" c="dimmed">
                        {formatTime(elapsedSeconds)} / {formatTime(deficitSeconds)}
                      </Text>
                      <Text size="xs" c="red" fw={600}>
                        Behind: {formatTime(balanceRemainingSeconds)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text size="xs" c="dimmed">
                        Caught up
                      </Text>
                      <Text size="xs" c="green" fw={600}>
                        +{formatTime(balanceRemainingSeconds)}
                      </Text>
                    </>
                  )}
                </Group>
                <Progress
                  value={balancePct}
                  color={isAhead ? 'green' : 'blue'}
                  size="sm"
                  radius="xl"
                />
              </Stack>
            )}

            {/* Session progress (shown first) */}
            {hasSessions && (
              <ScrollArea.Autosize mah={180} mb={hasUnitsBudget ? 'xs' : 0}>
                <Stack gap={6}>
                  {sessions.map((session) => (
                    <SessionRow
                      key={session.index}
                      session={session}
                      sessionBudgetSeconds={sessionBudgetSeconds}
                      sessionSeconds={sessionSeconds}
                    />
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            )}

            {/* Units-mode total budget bar (below session) */}
            {hasUnitsBudget && (
              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    {formatTime(cappedSessionSeconds)} / {formatTime(totalBudgetSeconds)}
                  </Text>
                  <Text
                    size="xs"
                    c={totalOver ? 'green' : 'dimmed'}
                    fw={totalOver ? 600 : undefined}
                  >
                    {totalOver ? 'Done!' : `Left: ${formatTime(totalRemaining)}`}
                  </Text>
                </Group>
                <Progress
                  value={totalPct}
                  color={totalOver ? 'green' : 'blue'}
                  size="xs"
                  radius="xl"
                />
              </Stack>
            )}
          </Paper>
        )}
      </Transition>
      <Modal
        opened={taskChangeOpen}
        onClose={() => setTaskChangeOpen(false)}
        title="Change Task"
        size="md"
        zIndex={1100}
      >
        <Stack gap="md">
          <Autocomplete
            label="Task"
            placeholder="Type or select a task..."
            data={recentLabels}
            value={newTaskLabel}
            onChange={setNewTaskLabel}
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setTaskChangeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitTaskChange} disabled={!newTaskLabel.trim()}>
              Update
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default FloatingTimer;
