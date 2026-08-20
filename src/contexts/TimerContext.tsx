import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MeContext } from './MeContext';
import {
  getRunningTimer,
  startRunningTimer,
  stopRunningTimer,
  updateRunningTimer,
} from '../services/requests/TodoRequests';
import { TimeEntry, TimerSessionData } from '../models/user/todo';

export interface TimerTarget {
  componentId: number;
  itemId: string;
  label: string;
  budgetHours: number;
  sessionBudgetHours?: number;
  preLoggedHours?: number;
  balanceHours?: number;
  dailyTargetHours?: number;
  todoBalanceId?: number;
  onStop: (elapsedHours: number) => void;
  onUpdateBalance?: (newBalance: number) => void;
}

export interface TimerSession {
  index: number;
  label: string;
  completed: boolean;
  progressPct: number;
  surplusSeconds?: number;
}

interface RunningTimer {
  entryId: number;
  componentId: number;
  itemId: string;
  label: string;
  budgetHours: number;
  sessionBudgetHours?: number;
  preLoggedHours: number;
  sessionTotalElapsed: number; // total elapsed from prior entries in this session (from API)
  sessionBudgetSeconds: number;
  sessionLabels: Record<number, string>;
  startTime: number;
  balanceHours?: number;
  dailyTargetHours?: number;
  todoBalanceId?: number;
}

interface TimerContextValue {
  activeTimer: { target: TimerTarget; startTime: number } | null;
  elapsedSeconds: number;
  sessionSeconds: number;
  totalTodaySeconds: number;
  sessions: TimerSession[];
  startTimer: (target: TimerTarget) => void;
  stopTimer: () => void;
  resetSession: () => void;
  isTracking: (componentId: number, itemId: string) => boolean;
  registerOnStop: (
    componentId: number,
    itemId: string,
    onStop: (elapsedHours: number) => void,
    meta?: {
      sessionBudgetHours?: number;
      preLoggedHours?: number;
      balanceHours?: number;
      dailyTargetHours?: number;
      todoBalanceId?: number;
      budgetHours?: number;
      onUpdateBalance?: (v: number) => void;
    },
  ) => void;
  registerAfterStop: (callback: (() => void) | null) => void;
  updateStartTime: (newStartTime: number) => void;
  labelCurrentSession: (label: string) => void;
}

const defaultValue: TimerContextValue = {
  activeTimer: null,
  elapsedSeconds: 0,
  sessionSeconds: 0,
  totalTodaySeconds: 0,
  sessions: [],
  startTimer: () => {},
  stopTimer: () => {},
  resetSession: () => {},
  isTracking: () => false,
  registerOnStop: () => {},
  registerAfterStop: () => {},
  updateStartTime: () => {},
  labelCurrentSession: () => {},
};

export const TimerContext = createContext<TimerContextValue>(defaultValue);

function entryToRunning(
  entry: TimeEntry,
  sessionData: TimerSessionData | null,
  balance?: number | null,
): RunningTimer | null {
  const startTime = new Date(entry.started_at).getTime();
  if (isNaN(startTime)) return null;
  return {
    entryId: entry.id!,
    componentId: entry.component_id ?? 0,
    itemId: entry.item_id ?? '',
    label: entry.label,
    budgetHours: entry.budget_hours ?? 0,
    sessionBudgetHours: entry.session_budget_hours ?? undefined,
    preLoggedHours: 0,
    sessionTotalElapsed: sessionData?.total_elapsed_seconds ?? 0,
    sessionBudgetSeconds:
      sessionData?.session_budget_seconds ?? (entry.session_budget_hours ?? 0) * 3600,
    sessionLabels: {},
    startTime,
    todoBalanceId: entry.todo_balance_id ?? undefined,
    // Rebuild balanceHours for hours-mode tasks (balance = -balanceHours). The API only sends
    // `balance` for hours-mode balances, so units tasks stay undefined (no balance bar).
    balanceHours: balance != null ? -balance : undefined,
  };
}

export const TimerContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { me } = useContext(MeContext);
  const [running, setRunning] = useState<RunningTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onStopRef = useRef<((elapsedHours: number) => void) | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Load running timer from DB on mount
  useEffect(() => {
    if (!me?.id) return;
    getRunningTimer(me.id)
      .then((res) => {
        const data = res.data;
        if (data && 'entry' in data && data.entry?.started_at && !data.entry?.stopped_at) {
          const r = entryToRunning(
            data.entry,
            data.session,
            (data as { balance?: number | null }).balance,
          );
          if (r) setRunning(r);
        } else if (
          data &&
          (data as Partial<TimeEntry>).started_at &&
          !(data as Partial<TimeEntry>).stopped_at
        ) {
          // Backward compat: old response shape (plain TimeEntry)
          const r = entryToRunning(data as unknown as TimeEntry, null);
          if (r) setRunning(r);
        }
      })
      .catch((e) => console.error('Failed to load timer', e))
      .finally(() => setLoaded(true));
  }, [me?.id]);

  // Tick interval
  useEffect(() => {
    clearTick();
    if (running) {
      const tick = () => {
        setElapsedSeconds(Math.floor((Date.now() - running.startTime) / 1000));
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return clearTick;
  }, [running, clearTick]);

  // Session elapsed = prior entries in session + current entry elapsed
  const sessionSeconds = running ? running.sessionTotalElapsed + elapsedSeconds : 0;

  // Total time today
  const totalTodaySeconds = useMemo(() => {
    if (!running) return 0;
    const startDate = new Date(running.startTime);
    const now = new Date();
    const sameDay =
      startDate.getFullYear() === now.getFullYear() &&
      startDate.getMonth() === now.getMonth() &&
      startDate.getDate() === now.getDate();
    if (sameDay) {
      return Math.floor(running.preLoggedHours * 3600) + elapsedSeconds;
    }
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.max(0, Math.floor((Date.now() - midnight) / 1000));
  }, [running, elapsedSeconds]);

  // Single-session model
  const sessions = useMemo((): TimerSession[] => {
    if (!running) return [];
    const budgetSec = running.sessionBudgetSeconds;
    if (budgetSec <= 0) return [];

    const totalSec = running.sessionTotalElapsed + elapsedSeconds;
    const completed = totalSec >= budgetSec;
    const pct = (totalSec / budgetSec) * 100;
    const surplus = completed ? totalSec - budgetSec : 0;

    return [
      {
        index: 0,
        label: running.sessionLabels[0] ?? 'Current session',
        completed,
        progressPct: Math.min(pct, 100),
        surplusSeconds: surplus,
      },
    ];
  }, [running, elapsedSeconds]);

  const labelCurrentSession = useCallback(
    (label: string) => {
      if (!running) return;
      setRunning((prev) => {
        if (!prev) return prev;
        return { ...prev, sessionLabels: { ...prev.sessionLabels, [0]: label } };
      });
    },
    [running],
  );

  const onUpdateBalanceRef = useRef<((v: number) => void) | null>(null);

  const registerOnStop = useCallback(
    (
      componentId: number,
      itemId: string,
      onStop: (elapsedHours: number) => void,
      meta?: {
        sessionBudgetHours?: number;
        preLoggedHours?: number;
        balanceHours?: number;
        dailyTargetHours?: number;
        todoBalanceId?: number;
        budgetHours?: number;
        onUpdateBalance?: (v: number) => void;
      },
    ) => {
      onStopRef.current = onStop;
      if (meta?.onUpdateBalance) onUpdateBalanceRef.current = meta.onUpdateBalance;
      if (meta) {
        setRunning((prev) => {
          if (!prev || prev.componentId !== componentId || prev.itemId !== itemId) return prev;
          let changed = false;
          const updates = { ...prev };
          if (meta.budgetHours != null) {
            updates.budgetHours = meta.budgetHours;
            changed = true;
          }
          if (meta.sessionBudgetHours != null && !prev.sessionBudgetHours) {
            updates.sessionBudgetHours = meta.sessionBudgetHours;
            changed = true;
          }
          if (meta.preLoggedHours != null && prev.preLoggedHours === 0 && meta.preLoggedHours > 0) {
            updates.preLoggedHours = meta.preLoggedHours;
            changed = true;
          }
          if (meta.balanceHours != null) {
            updates.balanceHours = meta.balanceHours;
            changed = true;
          }
          if (meta.dailyTargetHours != null && prev.dailyTargetHours == null) {
            updates.dailyTargetHours = meta.dailyTargetHours;
            changed = true;
          }
          if (meta.todoBalanceId != null && prev.todoBalanceId == null) {
            updates.todoBalanceId = meta.todoBalanceId;
            changed = true;
          }
          return changed ? updates : prev;
        });
      }
    },
    [],
  );

  const onAfterStopRef = useRef<(() => void) | null>(null);

  // Serialize timer network ops. Start and stop are independent requests; when the user
  // stops one task and immediately starts another, the server may process the START first —
  // an untargeted stop then closed the freshly-created entry at ~0s and its time silently
  // vanished (below the balance-logging threshold). Queueing guarantees arrival order.
  const timerOpRef = useRef<Promise<unknown>>(Promise.resolve());
  const enqueueTimerOp = useCallback(<T,>(op: () => Promise<T>): Promise<T> => {
    const next = timerOpRef.current.then(op, op);
    timerOpRef.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }, []);

  const stopTimer = useCallback(() => {
    // Capture WHICH entry this stop is for — the server must never stop anything else.
    // entryId is 0 while the start response is still in flight; item_id covers that case
    // (the op queue ensures the start has landed by the time the stop is sent).
    let target: { entry_id?: number; item_id?: string } | undefined;
    if (running) {
      const elapsedHours = (Date.now() - running.startTime) / 3_600_000;
      onStopRef.current?.(elapsedHours);
      onStopRef.current = null;
      target = {
        ...(running.entryId ? { entry_id: running.entryId } : {}),
        ...(running.itemId ? { item_id: running.itemId } : {}),
      };
    }
    const afterStop = onAfterStopRef.current;
    onAfterStopRef.current = null;
    setRunning(null);
    if (me?.id) {
      const userId = me.id;
      enqueueTimerOp(() => stopRunningTimer(userId, target))
        .then(() => {
          afterStop?.();
        })
        .catch((e) => console.error('Failed to stop timer', e));
    }
  }, [running, me?.id, enqueueTimerOp]);

  const startTimer = useCallback(
    (target: TimerTarget) => {
      // Auto-stop current timer first
      if (running) {
        const elapsedHours = (Date.now() - running.startTime) / 3_600_000;
        onStopRef.current?.(elapsedHours);
        onStopRef.current = null;
      }

      const startTime = Date.now();
      onStopRef.current = target.onStop;

      if (me?.id) {
        const userId = me.id;
        enqueueTimerOp(() =>
          startRunningTimer(userId, {
            label: target.label,
            component_id: target.componentId,
            item_id: target.itemId,
            started_at: new Date(startTime).toISOString(),
            budget_hours: target.budgetHours,
            session_budget_hours: target.sessionBudgetHours,
            todo_balance_id: target.todoBalanceId,
          }),
        )
          .then((res) => {
            const data = res.data;
            const r = entryToRunning(data.entry, data.session);
            if (r) {
              r.preLoggedHours = target.preLoggedHours ?? 0;
              r.balanceHours = target.balanceHours;
              r.dailyTargetHours = target.dailyTargetHours;
              setRunning(r);
            }
          })
          .catch((e) => console.error('Failed to start timer', e));
      }

      onUpdateBalanceRef.current = target.onUpdateBalance ?? null;

      // Optimistic local state (session data will be updated from server response)
      setRunning({
        entryId: 0,
        componentId: target.componentId,
        itemId: target.itemId,
        label: target.label,
        budgetHours: target.budgetHours,
        sessionBudgetHours: target.sessionBudgetHours,
        preLoggedHours: target.preLoggedHours ?? 0,
        sessionTotalElapsed: 0, // will be updated from server
        sessionBudgetSeconds: (target.sessionBudgetHours ?? 0) * 3600,
        sessionLabels: {},
        startTime,
        balanceHours: target.balanceHours,
        dailyTargetHours: target.dailyTargetHours,
        todoBalanceId: target.todoBalanceId,
      });
    },
    [running, me?.id, enqueueTimerOp],
  );

  const resetSession = useCallback(() => {
    // Called from markDone when the timer is on THIS node. The BACKEND performs the actual
    // split atomically inside the mark-off PATCH (stop+log the running entry, complete the
    // session, bank/reset logged time, continue into a fresh session+entry) — issuing our own
    // stop/start here raced that PATCH and re-credited already-banked time or attached the
    // continuation entry to the just-completed session. Only reset the local display.
    if (running) {
      const startTime = Date.now();
      setRunning((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sessionTotalElapsed: 0,
          sessionBudgetSeconds: prev.sessionBudgetSeconds,
          sessionLabels: {},
          startTime,
        };
      });
      // Don't fire the old onStop patch either — the backend logs the entry itself.
      onStopRef.current = null;
    }
    // If not running: the session completion happens server-side via the groups/last_date PATCH
    // Next startTimer will create a new session automatically
  }, [running]);

  const updateStartTime = useCallback(
    (newStartTime: number) => {
      setRunning((prev) => {
        if (!prev) return prev;
        return { ...prev, startTime: newStartTime };
      });
      if (me?.id) {
        const userId = me.id;
        enqueueTimerOp(() =>
          updateRunningTimer(userId, {
            started_at: new Date(newStartTime).toISOString(),
          }),
        ).catch((e) => console.error('Failed to update timer start time', e));
      }
    },
    [me?.id, enqueueTimerOp],
  );

  const isTracking = useCallback(
    // Match on item_id only. component_id is per-day-page and changes when the day rolls over
    // mid-session, so requiring it would make the new day's copy of the task stop recognizing
    // the still-running timer (wrong Play/Stop button, deficit ignoring the live session).
    (_componentId: number, itemId: string) => {
      return !!running && running.itemId === itemId;
    },
    [running],
  );

  const activeTimer = running
    ? {
        target: {
          componentId: running.componentId,
          itemId: running.itemId,
          label: running.label,
          budgetHours: running.budgetHours,
          sessionBudgetHours: running.sessionBudgetHours,
          preLoggedHours: running.preLoggedHours,
          balanceHours: running.balanceHours,
          dailyTargetHours: running.dailyTargetHours,
          todoBalanceId: running.todoBalanceId,
          onStop: onStopRef.current ?? (() => {}),
          onUpdateBalance: onUpdateBalanceRef.current ?? undefined,
        },
        startTime: running.startTime,
      }
    : null;

  return (
    <TimerContext.Provider
      value={{
        activeTimer,
        elapsedSeconds,
        sessionSeconds,
        totalTodaySeconds,
        sessions,
        startTimer,
        stopTimer,
        resetSession,
        isTracking,
        registerOnStop,
        registerAfterStop: useCallback((cb: (() => void) | null) => {
          onAfterStopRef.current = cb;
        }, []),
        updateStartTime,
        labelCurrentSession,
      }}
    >
      {loaded ? children : null}
    </TimerContext.Provider>
  );
};
