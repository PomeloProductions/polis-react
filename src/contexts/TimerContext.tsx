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
} from '../services/requests/TodoRequests';
import { TimeEntry } from '../models/user/todo';

export interface TimerTarget {
  componentId: number;
  itemId: string;
  label: string;
  budgetHours: number;
  sessionBudgetHours?: number;
  preLoggedHours?: number;
  balanceHours?: number; // current hour balance for hours-mode tasks
  dailyTargetHours?: number; // daily allotment for hours-mode progress bar
  todoBalanceId?: number; // FK to todo_balances for live balance reads
  onStop: (elapsedHours: number) => void;
  onUpdateBalance?: (newBalance: number) => void;
}

export interface TimerSession {
  index: number;
  label: string;
  completed: boolean;
  progressPct: number;
  surplusSeconds?: number; // seconds over budget
}

/** Local runtime state derived from the running time_entry in the DB */
interface RunningTimer {
  entryId: number;
  componentId: number;
  itemId: string;
  label: string;
  budgetHours: number;
  sessionBudgetHours?: number;
  preLoggedHours: number;
  sessionElapsedSeconds: number; // accumulated session time from prior stop/starts
  sessionLabels: Record<number, string>;
  startTime: number; // epoch ms
  balanceHours?: number;
  dailyTargetHours?: number;
  todoBalanceId?: number;
}

interface TimerContextValue {
  activeTimer: { target: TimerTarget; startTime: number } | null;
  elapsedSeconds: number;
  /** Session elapsed in seconds (survives stop/start, resets on mark-done) */
  sessionSeconds: number;
  /** Total time today in seconds: preLogged + elapsed */
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

function timeEntryToRunning(entry: TimeEntry): RunningTimer | null {
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
    sessionElapsedSeconds: entry.session_elapsed_seconds ?? 0,
    sessionLabels: {},
    startTime,
    todoBalanceId: entry.todo_balance_id ?? undefined,
  };
}

export const TimerContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { me } = useContext(MeContext);
  const [running, setRunning] = useState<RunningTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onStopRef = useRef<((elapsedHours: number) => void) | null>(null);
  // Preserves session progress between stop and start for the same task
  const lastSessionRef = useRef<{
    componentId: number;
    itemId: string;
    sessionElapsedSeconds: number;
  } | null>(null);

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
        if (res.data && res.data.started_at && !res.data.stopped_at) {
          const r = timeEntryToRunning(res.data);
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

  // Session elapsed = accumulated from prior stops + current entry elapsed
  const sessionSeconds = running ? running.sessionElapsedSeconds + elapsedSeconds : 0;

  // Total time today = pre-logged hours + elapsed (but reset pre-logged on day rollover)
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

    // Day rolled over: only count time since midnight
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.max(0, Math.floor((Date.now() - midnight) / 1000));
  }, [running, elapsedSeconds]);

  // Single-session model: one session that shows surplus when over budget
  const sessions = useMemo((): TimerSession[] => {
    if (!running) return [];
    const sessionBudgetSec = (running.sessionBudgetHours ?? 0) * 3600;
    if (sessionBudgetSec <= 0) return [];

    const totalSec = running.sessionElapsedSeconds + elapsedSeconds;
    const completed = totalSec >= sessionBudgetSec;
    const pct = (totalSec / sessionBudgetSec) * 100;
    const surplus = completed ? totalSec - sessionBudgetSec : 0;

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

  const stopTimer = useCallback(() => {
    if (running) {
      const elapsedHours = (Date.now() - running.startTime) / 3_600_000;
      onStopRef.current?.(elapsedHours);
      onStopRef.current = null;
      // Preserve session progress for resume
      const entryElapsed = Math.floor((Date.now() - running.startTime) / 1000);
      lastSessionRef.current = {
        componentId: running.componentId,
        itemId: running.itemId,
        sessionElapsedSeconds: running.sessionElapsedSeconds + entryElapsed,
      };
    }
    const afterStop = onAfterStopRef.current;
    onAfterStopRef.current = null;
    const totalSession = lastSessionRef.current?.sessionElapsedSeconds;
    setRunning(null);
    if (me?.id) {
      stopRunningTimer(
        me.id,
        totalSession != null ? { session_elapsed_seconds: totalSession } : undefined,
      )
        .then(() => {
          afterStop?.();
        })
        .catch((e) => console.error('Failed to stop timer', e));
    }
  }, [running, me?.id]);

  const startTimer = useCallback(
    (target: TimerTarget) => {
      // Auto-stop current timer first (local callback only; backend handles stopping existing)
      if (running) {
        const elapsedHours = (Date.now() - running.startTime) / 3_600_000;
        onStopRef.current?.(elapsedHours);
        onStopRef.current = null;
      }

      // Restore session progress if resuming the same task
      const prior = lastSessionRef.current;
      const sessionElapsed =
        prior && prior.componentId === target.componentId && prior.itemId === target.itemId
          ? prior.sessionElapsedSeconds
          : 0;
      lastSessionRef.current = null;

      const startTime = Date.now();
      onStopRef.current = target.onStop;

      if (me?.id) {
        startRunningTimer(me.id, {
          label: target.label,
          component_id: target.componentId,
          item_id: target.itemId,
          started_at: new Date(startTime).toISOString(),
          budget_hours: target.budgetHours,
          session_budget_hours: target.sessionBudgetHours,
          todo_balance_id: target.todoBalanceId,
          session_elapsed_seconds: sessionElapsed,
        })
          .then((res) => {
            const r = timeEntryToRunning(res.data);
            if (r) {
              r.preLoggedHours = target.preLoggedHours ?? 0;
              r.balanceHours = target.balanceHours;
              r.dailyTargetHours = target.dailyTargetHours;
              r.sessionElapsedSeconds = sessionElapsed;
              setRunning(r);
            }
          })
          .catch((e) => console.error('Failed to start timer', e));
      }

      onUpdateBalanceRef.current = target.onUpdateBalance ?? null;

      // Optimistically set local state
      setRunning({
        entryId: 0,
        componentId: target.componentId,
        itemId: target.itemId,
        label: target.label,
        budgetHours: target.budgetHours,
        sessionBudgetHours: target.sessionBudgetHours,
        preLoggedHours: target.preLoggedHours ?? 0,
        sessionElapsedSeconds: sessionElapsed,
        sessionLabels: {},
        startTime,
        balanceHours: target.balanceHours,
        dailyTargetHours: target.dailyTargetHours,
        todoBalanceId: target.todoBalanceId,
      });
    },
    [running, me?.id],
  );

  const resetSession = useCallback(() => {
    if (running) {
      // Timer is running: log current entry time, restart with fresh session
      const elapsedHours = (Date.now() - running.startTime) / 3_600_000;
      onStopRef.current?.(elapsedHours);

      const startTime = Date.now();
      setRunning((prev) => {
        if (!prev) return prev;
        return { ...prev, sessionElapsedSeconds: 0, sessionLabels: {}, startTime };
      });

      if (me?.id) {
        startRunningTimer(me.id, {
          label: running.label,
          component_id: running.componentId,
          item_id: running.itemId,
          started_at: new Date(startTime).toISOString(),
          budget_hours: running.budgetHours,
          session_budget_hours: running.sessionBudgetHours,
          todo_balance_id: running.todoBalanceId,
          session_elapsed_seconds: 0,
        })
          .then((res) => {
            const r = timeEntryToRunning(res.data);
            if (r) {
              r.preLoggedHours = running.preLoggedHours;
              r.balanceHours = running.balanceHours;
              r.dailyTargetHours = running.dailyTargetHours;
              r.sessionElapsedSeconds = 0;
              setRunning(r);
            }
          })
          .catch((e) => console.error('Failed to reset session', e));
      }
    } else {
      // Timer not running: clear stored session so next start is fresh
      lastSessionRef.current = null;
    }
  }, [running, me?.id]);

  const updateStartTime = useCallback(
    (newStartTime: number) => {
      setRunning((prev) => {
        if (!prev) return prev;
        return { ...prev, startTime: newStartTime };
      });
      if (me?.id && running) {
        startRunningTimer(me.id, {
          label: running.label,
          component_id: running.componentId,
          item_id: running.itemId,
          started_at: new Date(newStartTime).toISOString(),
          budget_hours: running.budgetHours,
          session_budget_hours: running.sessionBudgetHours,
          todo_balance_id: running.todoBalanceId,
          session_elapsed_seconds: running.sessionElapsedSeconds,
        })
          .then((res) => {
            const r = timeEntryToRunning(res.data);
            if (r) {
              r.preLoggedHours = running.preLoggedHours;
              r.sessionLabels = running.sessionLabels;
              r.sessionBudgetHours = running.sessionBudgetHours;
              r.balanceHours = running.balanceHours;
              r.dailyTargetHours = running.dailyTargetHours;
              r.todoBalanceId = running.todoBalanceId;
              r.sessionElapsedSeconds = running.sessionElapsedSeconds;
              setRunning(r);
            }
          })
          .catch((e) => console.error('Failed to update timer start time', e));
      }
    },
    [me?.id, running],
  );

  const isTracking = useCallback(
    (componentId: number, itemId: string) => {
      return running?.componentId === componentId && running?.itemId === itemId;
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
