import { AxiosResponse } from 'axios';
import api, { dedupedGet } from '../api';
import { UserPage } from '../../models/user/user-page';
import {
  TodoTemplate,
  TodoSetting,
  TodoHierarchy,
  TimeEntry,
  TodoBalance,
  TimerResponse,
  TimerSessionData,
} from '../../models/user/todo';

export function getTodoToday(userId: number): Promise<AxiosResponse<UserPage>> {
  return dedupedGet(`/users/${userId}/todos/today`);
}

export function getTodoResolve(userId: number, slug: string): Promise<AxiosResponse<UserPage>> {
  return dedupedGet(`/users/${userId}/todos/resolve`, {
    params: { slug },
  });
}

export function getTodoNavigate(
  userId: number,
  level: string,
  date: string,
): Promise<AxiosResponse<UserPage>> {
  return dedupedGet(`/users/${userId}/todos/navigate`, {
    params: { level, date },
  });
}

export function getTodoHierarchy(
  userId: number,
  year: number,
): Promise<AxiosResponse<TodoHierarchy>> {
  return dedupedGet(`/users/${userId}/todos/hierarchy`, {
    params: { year },
  });
}

export function postTodoGenerate(
  userId: number,
  throughDate: string,
): Promise<AxiosResponse<{ generated_count: number; through_date: string }>> {
  return api.post(`/users/${userId}/todos/generate`, {
    through_date: throughDate,
  });
}

export function getTodoSettings(userId: number): Promise<AxiosResponse<TodoSetting>> {
  return dedupedGet(`/users/${userId}/todos/settings`);
}

export function updateTodoSettings(
  userId: number,
  data: Partial<TodoSetting>,
): Promise<AxiosResponse<TodoSetting>> {
  return api.put(`/users/${userId}/todos/settings`, data);
}

export function getBalances(userId: number): Promise<AxiosResponse<{ data: TodoBalance[] }>> {
  return dedupedGet(`/users/${userId}/todos/balances`);
}

export function getRunningTimer(userId: number): Promise<AxiosResponse<TimerResponse | null>> {
  return dedupedGet(`/users/${userId}/todos/timer`);
}

export function startRunningTimer(
  userId: number,
  data: {
    label: string;
    component_id?: number;
    item_id?: string;
    started_at: string;
    budget_hours?: number;
    session_budget_hours?: number;
    todo_balance_id?: number;
  },
): Promise<AxiosResponse<TimerResponse>> {
  return api.post(`/users/${userId}/todos/timer`, data);
}

export function updateRunningTimer(
  userId: number,
  data: { started_at?: string; label?: string; component_id?: number; item_id?: string },
): Promise<AxiosResponse<TimerResponse>> {
  return api.patch(`/users/${userId}/todos/timer`, data);
}

export function stopRunningTimer(
  userId: number,
  // Identifies the entry the client means to stop, so a stop racing the next task's start
  // can never close the freshly-created entry. Omitted = legacy stop-whatever-is-running.
  target?: { entry_id?: number; item_id?: string },
): Promise<AxiosResponse<{ entry: TimeEntry; session: TimerSessionData | null } | void>> {
  return api.delete(`/users/${userId}/todos/timer`, { params: target });
}

export function getTodoTemplates(userId: number): Promise<AxiosResponse<{ data: TodoTemplate[] }>> {
  return dedupedGet(`/users/${userId}/todos/templates`);
}

export function createTodoTemplate(
  userId: number,
  data: Partial<TodoTemplate>,
): Promise<AxiosResponse<TodoTemplate>> {
  return api.post(`/users/${userId}/todos/templates`, data);
}

export function updateTodoTemplate(
  userId: number,
  templateId: number,
  data: Partial<TodoTemplate>,
): Promise<AxiosResponse<TodoTemplate>> {
  return api.put(`/users/${userId}/todos/templates/${templateId}`, data);
}

export function deleteTodoTemplate(userId: number, templateId: number): Promise<AxiosResponse> {
  return api.delete(`/users/${userId}/todos/templates/${templateId}`);
}

export function patchTodoNode(
  userId: number,
  clientId: string,
  componentId: number,
  data: Record<string, unknown>,
): Promise<AxiosResponse<{ root: Record<string, unknown> }>> {
  return api.patch(`/users/${userId}/todos/nodes/${clientId}`, {
    ...data,
    component_id: componentId,
  });
}

export function getTimeEntries(
  userId: number,
  from?: string,
  to?: string,
  limit?: number,
): Promise<AxiosResponse<{ data: TimeEntry[] }>> {
  return dedupedGet(`/users/${userId}/todos/time-entries`, {
    params: { from, to, limit },
  });
}

export function createTimeEntry(
  userId: number,
  data: {
    label: string;
    started_at: string;
    stopped_at?: string | null;
    duration_seconds: number;
    note?: string;
    color?: string;
  },
): Promise<AxiosResponse<TimeEntry>> {
  return api.post(`/users/${userId}/todos/time-entries`, data);
}

export function updateTimeEntry(
  userId: number,
  entryId: number,
  data: {
    label?: string;
    started_at?: string;
    stopped_at?: string;
    duration_seconds?: number;
    note?: string;
    color?: string;
  },
): Promise<AxiosResponse<TimeEntry>> {
  return api.put(`/users/${userId}/todos/time-entries/${entryId}`, data);
}

export function deleteTimeEntry(userId: number, entryId: number): Promise<AxiosResponse<void>> {
  return api.delete(`/users/${userId}/todos/time-entries/${entryId}`);
}

// Calendars
export interface TodoCalendar {
  id: number;
  user_id: number;
  name: string;
  days_of_week: number[] | null;
  specific_dates: string[] | null;
  is_exclusion: boolean;
  /** When false, tasks scheduled solely by this calendar don't accrue their daily increment on vacation days. */
  active_on_vacation: boolean;
}

export interface VacationStatus {
  on_vacation: boolean;
  current_period: { id: number; start_date: string; end_date: string | null } | null;
}

export function getCalendars(userId: number): Promise<AxiosResponse<{ data: TodoCalendar[] }>> {
  return dedupedGet(`/users/${userId}/todos/calendars`);
}

export function createCalendar(
  userId: number,
  data: Partial<TodoCalendar>,
): Promise<AxiosResponse<TodoCalendar>> {
  return api.post(`/users/${userId}/todos/calendars`, data);
}

export function updateCalendar(
  userId: number,
  calId: number,
  data: Partial<TodoCalendar>,
): Promise<AxiosResponse<TodoCalendar>> {
  return api.put(`/users/${userId}/todos/calendars/${calId}`, data);
}

export function deleteCalendar(userId: number, calId: number): Promise<AxiosResponse<void>> {
  return api.delete(`/users/${userId}/todos/calendars/${calId}`);
}

export function getVacationStatus(userId: number): Promise<AxiosResponse<VacationStatus>> {
  return dedupedGet(`/users/${userId}/todos/vacation`);
}

export function setVacationStatus(
  userId: number,
  onVacation: boolean,
  endDate?: string | null,
): Promise<AxiosResponse<VacationStatus>> {
  const body: Record<string, unknown> = { on_vacation: onVacation };
  // Only include end_date when the caller explicitly passes it (null = open-ended).
  if (endDate !== undefined) body.end_date = endDate;
  return api.put(`/users/${userId}/todos/vacation`, body);
}
