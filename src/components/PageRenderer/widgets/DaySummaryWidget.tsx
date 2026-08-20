import React, { useContext, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { Paper, SimpleGrid, Stack, Text, Group, Badge, Divider, Tooltip } from '@mantine/core';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { ComponentProps } from '../ComponentRegistry';
import { TodoContext } from '../../../contexts/TodoContext';
import { TimerContext } from '../../../contexts/TimerContext';
import { MeContext } from '../../../contexts/MeContext';
import { TodoBalance, TimeEntry } from '../../../models/user/todo';
import { UserPage } from '../../../models/user/user-page';
import {
  formatHoursHHMM,
  TodoTaskNode,
  computeTotals,
  buildBalanceMap,
  getTrackingMode,
} from '../../Todo/todoTaskUtils';
import {
  patchTodoNode,
  getTimeEntries,
  getCalendars,
  getVacationStatus,
  TodoCalendar,
} from '../../../services/requests/TodoRequests';
import VacationControl from '../../Todo/VacationControl';
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
  newHoursRemaining: number;
  remainingItems: RemainingItem[];
}

// Returns true if `date` is included by this calendar.
// specific_dates entries prefixed with "!" are exclusions and override the day-of-week pattern.
function calendarIncludesDate(cal: TodoCalendar, ymd: string, dayOfWeek: number): boolean {
  if (cal.specific_dates && cal.specific_dates.includes(`!${ymd}`)) return false;
  if (cal.days_of_week && cal.days_of_week.includes(dayOfWeek)) return true;
  if (cal.specific_dates && cal.specific_dates.includes(ymd)) return true;
  return false;
}

function isNodeScheduledOnDate(
  node: TodoTaskNode,
  ymd: string,
  dayOfWeek: number,
  calendarsById: Map<number, TodoCalendar>,
): boolean {
  const rules = node.calendar_rules;
  if (rules && rules.length > 0) {
    let included = false;
    for (const r of rules) {
      if (r.mode === 'add') {
        const cal = calendarsById.get(r.calendar_id);
        if (cal && calendarIncludesDate(cal, ymd, dayOfWeek)) {
          included = true;
          break;
        }
      }
    }
    if (!included) return false;
    for (const r of rules) {
      if (r.mode === 'subtract') {
        const cal = calendarsById.get(r.calendar_id);
        if (cal && calendarIncludesDate(cal, ymd, dayOfWeek)) return false;
      }
    }
    return true;
  }
  const schedule = node.schedule;
  return !schedule || schedule.includes(dayOfWeek);
}

/**
 * Whether a node actually accrues new hours on the given date — scheduled AND (on a vacation day)
 * governed by at least one calendar that stays active on vacation. Mirrors the daily-increment
 * cron: calendars marked "paused on vacation" don't accrue on vacation days. Schedule-only nodes
 * (no calendars) are unaffected — vacation is a per-calendar setting.
 */
function nodeAccruesOnDate(
  node: TodoTaskNode,
  ymd: string,
  dayOfWeek: number,
  calendarsById: Map<number, TodoCalendar>,
  isVacationDay: boolean,
): boolean {
  if (!isNodeScheduledOnDate(node, ymd, dayOfWeek, calendarsById)) return false;
  if (!isVacationDay) return true;
  const rules = node.calendar_rules;
  if (!rules || rules.length === 0) return true; // schedule-only: vacation doesn't pause it
  for (const r of rules) {
    if (r.mode === 'add') {
      const cal = calendarsById.get(r.calendar_id);
      if (cal && cal.active_on_vacation && calendarIncludesDate(cal, ymd, dayOfWeek)) return true;
    }
  }
  return false; // all calendars scheduling this date are paused on vacation
}

function computeStats(
  balances: TodoBalance[],
  balancesAsOf: Record<number, number>,
  page: UserPage | null,
  today: Date,
  calendarsById: Map<number, TodoCalendar>,
  isVacationDay: boolean,
): DayStats {
  const dayOfWeek = today.getDay();
  const todayYMDForSchedule = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // On historical day pages, use the snapshot (node.tally) — not the live balance.
  const now = new Date();
  const realTodayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const pageDate = (page?.config_json as Record<string, unknown> | undefined)?.todo_date as
    | string
    | undefined;
  const pageLevel = (page?.config_json as Record<string, unknown> | undefined)?.todo_level as
    | string
    | undefined;
  const isPastDay = pageLevel === 'day' && !!pageDate && pageDate < realTodayYMD;
  // Historical days derive from the balance log (balancesAsOf), not the per-node tally snapshot;
  // today derives from the live balances. Both avoid the unreliable snapshot.
  const bMap = isPastDay
    ? new Map<number, number>(
        Object.entries(balancesAsOf ?? {}).map(([k, v]) => [Number(k), Number(v)]),
      )
    : buildBalanceMap(balances);

  let hoursBalance = 0;
  let newHoursToday = 0;
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

    // Per-item: compute new hours, remaining, and logged-on-today-items
    const walkForNew = (node: TodoTaskNode) => {
      const nodeHasOwnTracking =
        getTrackingMode(node) === 'hours' ||
        ((node.tally_step ?? 0) > 0 && (node.time_budget_hours ?? 0) > 0);
      if (node.task_type === 'category' && node.children) {
        node.children.forEach(walkForNew);
        if (!nodeHasOwnTracking) return;
        // Fall through to count the category's own allotment
      }

      if (!nodeAccruesOnDate(node, todayYMDForSchedule, dayOfWeek, calendarsById, isVacationDay))
        return;

      const trackingMode = getTrackingMode(node);
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
        // Any slot or descendant item marked today counts the rotating node as done
        const markedToday = (n: TodoTaskNode): boolean =>
          isToday(n.last_date) || (n.children ?? []).some(markedToday);
        const wasMarkedDone =
          node.task_type === 'rotating' && (node.children ?? []).some(markedToday);
        const itemRemaining = wasMarkedDone
          ? 0 // Completed by marking done — no time remaining
          : itemLogged > 0
            ? Math.max(0, allotment - itemLogged) // Partially logged
            : allotment; // Untouched
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

  return { hoursBalance, newHoursToday, newHoursRemaining, remainingItems };
}

const DaySummaryWidget: React.FC<ComponentProps> = ({ componentId, config, onDisplayUpdate }) => {
  const { balances, balancesAsOf, currentPage } = useContext(TodoContext);
  const { elapsedSeconds, activeTimer } = useContext(TimerContext);
  const { me } = useContext(MeContext);

  const todoDate = (currentPage?.config_json as Record<string, unknown>)?.todo_date as
    | string
    | undefined;
  const today = todoDate ? new Date(todoDate + 'T00:00:00') : new Date();
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const [calendars, setCalendars] = useState<TodoCalendar[]>([]);
  useEffect(() => {
    if (!me?.id) return;
    let cancelled = false;
    getCalendars(me.id)
      .then((res) => {
        if (!cancelled) setCalendars(res.data?.data ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [me?.id]);
  const calendarsById = useMemo(() => {
    const m = new Map<number, TodoCalendar>();
    for (const c of calendars) m.set(c.id, c);
    return m;
  }, [calendars]);

  // Vacation period in effect (if any), so "new hours" excludes calendars paused on vacation.
  const [vacationPeriod, setVacationPeriod] = useState<{
    start_date: string;
    end_date: string | null;
  } | null>(null);
  useEffect(() => {
    if (!me?.id) return;
    let cancelled = false;
    getVacationStatus(me.id)
      .then((res) => {
        if (!cancelled) setVacationPeriod(res.data.current_period ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [me?.id]);

  const pageYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isVacationDay =
    !!vacationPeriod &&
    pageYMD >= vacationPeriod.start_date.slice(0, 10) &&
    (vacationPeriod.end_date === null || pageYMD <= vacationPeriod.end_date.slice(0, 10));

  const baseStats = useMemo(
    () => computeStats(balances, balancesAsOf, currentPage, today, calendarsById, isVacationDay),
    [balances, balancesAsOf, currentPage, today.getTime(), calendarsById, isVacationDay],
  );

  // Fetch today's time entries — ground truth for "logged today"
  const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const activeItemId = activeTimer?.target.itemId ?? null;
  const prevActiveItemIdRef = useRef<string | null>(activeItemId);
  useEffect(() => {
    if (!me?.id) return;
    let cancelled = false;
    const dayStart = `${todayYMD}T00:00:00`;
    const dayEnd = `${todayYMD}T23:59:59`;

    const fetchEntries = () => {
      getTimeEntries(me.id!, dayStart, dayEnd, 500)
        .then((res) => {
          if (!cancelled) setTodayEntries(res.data?.data ?? []);
        })
        .catch(() => {});
    };

    const wasActive = prevActiveItemIdRef.current !== null;
    const isActive = activeItemId !== null;
    prevActiveItemIdRef.current = activeItemId;

    // Always do an immediate fetch
    fetchEntries();

    // If a timer just stopped (active → null), the backend write isn't visible yet —
    // do follow-up fetches to pick up the newly persisted entry.
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    if (wasActive && !isActive) {
      timeouts.push(setTimeout(fetchEntries, 500));
      timeouts.push(setTimeout(fetchEntries, 1500));
    }

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [me?.id, todayYMD, activeItemId]);

  // Build per-task logged breakdown from real entries + active timer's current entry elapsed
  const activeEntryElapsedHours = activeTimer ? elapsedSeconds / 3600 : 0;
  const activeTimerLabel = activeTimer?.target.label;
  const loggedItemsForTooltip = useMemo(() => {
    const byLabel = new Map<string, number>();
    for (const e of todayEntries) {
      // Skip the currently-running entry — we'll add its live elapsed below
      if (e.stopped_at === null) continue;
      byLabel.set(e.label, (byLabel.get(e.label) ?? 0) + e.duration_seconds / 3600);
    }
    if (activeTimer && activeEntryElapsedHours > 0 && activeTimerLabel) {
      byLabel.set(activeTimerLabel, (byLabel.get(activeTimerLabel) ?? 0) + activeEntryElapsedHours);
    }
    return [...byLabel.entries()]
      .map(([label, logged]) => ({ label, logged }))
      .filter((i) => i.logged > 0)
      .sort((a, b) => b.logged - a.logged);
  }, [todayEntries, activeTimer, activeEntryElapsedHours, activeTimerLabel]);

  const loggedTotalHours = loggedItemsForTooltip.reduce((sum, i) => sum + i.logged, 0);
  const stats = {
    ...baseStats,
    loggedToday: loggedTotalHours,
  };

  // Notes via tiptap
  const notes = (config.notes as string) ?? '';
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const saveNotes = useCallback(
    (html: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onDisplayUpdate({ ...configRef.current, notes: html });
        // Persist via component update
        if (me?.id) {
          const rootId = (configRef.current.root as Record<string, unknown>)?.id as
            | string
            | undefined;
          if (rootId) {
            patchTodoNode(me.id, rootId, componentId, { description: html }).catch(console.error);
          }
        }
      }, 1000);
    },
    [me?.id, componentId, onDisplayUpdate],
  );

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
          <Text fw={700} size="lg">
            {dateLabel}
          </Text>
          <Badge size="lg" variant="light" color="blue">
            My Day
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          <Paper p="sm" radius="sm" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
              Hours Balance
            </Text>
            <Text fw={700} size="lg" c={stats.hoursBalance >= 0 ? 'green' : 'red'}>
              {stats.hoursBalance >= 0 ? '+' : ''}
              {formatHoursHHMM(stats.hoursBalance)}
            </Text>
          </Paper>
          <Paper p="sm" radius="sm" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
              New Hours Today
            </Text>
            <Text fw={700} size="lg" c="blue">
              {formatHoursHHMM(stats.newHoursToday)}
            </Text>
          </Paper>
          <Paper p="sm" radius="sm" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
              Logged Today
            </Text>
            <Tooltip
              multiline
              w={300}
              position="bottom"
              withArrow
              label={
                loggedItemsForTooltip.length > 0
                  ? loggedItemsForTooltip
                      .map((li) => `${li.label}: ${formatHoursHHMM(li.logged)}`)
                      .join('\n')
                  : 'Nothing logged yet today.'
              }
              styles={{ tooltip: { whiteSpace: 'pre-line', fontSize: 12 } }}
            >
              <Text fw={700} size="lg" c="teal" style={{ cursor: 'default' }}>
                {formatHoursHHMM(stats.loggedToday)}
              </Text>
            </Tooltip>
          </Paper>
          <Paper p="sm" radius="sm" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
              New Hours Remaining
            </Text>
            <Tooltip
              multiline
              w={300}
              position="bottom"
              withArrow
              label={
                baseStats.remainingItems.length > 0
                  ? baseStats.remainingItems
                      .map((ri) => `${ri.label}: ${formatHoursHHMM(ri.remaining)}`)
                      .join('\n')
                  : 'All tasks fulfilled!'
              }
              styles={{ tooltip: { whiteSpace: 'pre-line', fontSize: 12 } }}
            >
              <Text
                fw={700}
                size="lg"
                c={stats.newHoursRemaining > 0 ? 'orange' : 'green'}
                style={{ cursor: 'default' }}
              >
                {formatHoursHHMM(stats.newHoursRemaining)}
              </Text>
            </Tooltip>
          </Paper>
        </SimpleGrid>

        <VacationControl />

        <Divider />

        <div>
          <Text size="sm" fw={500} mb={4}>
            Notes
          </Text>
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
