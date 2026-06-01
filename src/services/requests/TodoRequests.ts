import { AxiosResponse } from 'axios';
import api, { dedupedGet } from '../api';
import { UserPage } from '../../models/user/user-page';
import { TodoTemplate, TodoSetting, TodoHierarchy, TimeEntry, TodoBalance } from '../../models/user/todo';

export function getTodoToday(
    userId: number
): Promise<AxiosResponse<UserPage>> {
    return dedupedGet(`/users/${userId}/todos/today`);
}

export function getTodoResolve(
    userId: number,
    slug: string
): Promise<AxiosResponse<UserPage>> {
    return dedupedGet(`/users/${userId}/todos/resolve`, {
        params: { slug },
    });
}

export function getTodoNavigate(
    userId: number,
    level: string,
    date: string
): Promise<AxiosResponse<UserPage>> {
    return dedupedGet(`/users/${userId}/todos/navigate`, {
        params: { level, date },
    });
}

export function getTodoHierarchy(
    userId: number,
    year: number
): Promise<AxiosResponse<TodoHierarchy>> {
    return dedupedGet(`/users/${userId}/todos/hierarchy`, {
        params: { year },
    });
}

export function postTodoGenerate(
    userId: number,
    throughDate: string
): Promise<AxiosResponse<{ generated_count: number; through_date: string }>> {
    return api.post(`/users/${userId}/todos/generate`, {
        through_date: throughDate,
    });
}

export function getTodoSettings(
    userId: number
): Promise<AxiosResponse<TodoSetting>> {
    return dedupedGet(`/users/${userId}/todos/settings`);
}

export function updateTodoSettings(
    userId: number,
    data: Partial<TodoSetting>
): Promise<AxiosResponse<TodoSetting>> {
    return api.put(`/users/${userId}/todos/settings`, data);
}

export function getBalances(
    userId: number
): Promise<AxiosResponse<{ data: TodoBalance[] }>> {
    return dedupedGet(`/users/${userId}/todos/balances`);
}

export function getRunningTimer(
    userId: number
): Promise<AxiosResponse<TimeEntry | null>> {
    return dedupedGet(`/users/${userId}/todos/timer`);
}

export function startRunningTimer(
    userId: number,
    data: { label: string; component_id?: number; item_id?: string; started_at: string; budget_hours?: number; session_budget_hours?: number; todo_balance_id?: number; session_elapsed_seconds?: number }
): Promise<AxiosResponse<TimeEntry>> {
    return api.post(`/users/${userId}/todos/timer`, data);
}

export function stopRunningTimer(
    userId: number,
    data?: { session_elapsed_seconds?: number }
): Promise<AxiosResponse<TimeEntry | void>> {
    return api.delete(`/users/${userId}/todos/timer`, { data });
}

export function getTodoTemplates(
    userId: number
): Promise<AxiosResponse<{ data: TodoTemplate[] }>> {
    return dedupedGet(`/users/${userId}/todos/templates`);
}

export function createTodoTemplate(
    userId: number,
    data: Partial<TodoTemplate>
): Promise<AxiosResponse<TodoTemplate>> {
    return api.post(`/users/${userId}/todos/templates`, data);
}

export function updateTodoTemplate(
    userId: number,
    templateId: number,
    data: Partial<TodoTemplate>
): Promise<AxiosResponse<TodoTemplate>> {
    return api.put(`/users/${userId}/todos/templates/${templateId}`, data);
}

export function deleteTodoTemplate(
    userId: number,
    templateId: number
): Promise<AxiosResponse> {
    return api.delete(`/users/${userId}/todos/templates/${templateId}`);
}

export function patchTodoNode(
    userId: number,
    clientId: string,
    componentId: number,
    data: Record<string, unknown>
): Promise<AxiosResponse<{ root: Record<string, unknown> }>> {
    return api.patch(`/users/${userId}/todos/nodes/${clientId}`, { ...data, component_id: componentId });
}

export function getTimeEntries(
    userId: number,
    from?: string,
    to?: string
): Promise<AxiosResponse<{ data: TimeEntry[] }>> {
    return dedupedGet(`/users/${userId}/todos/time-entries`, {
        params: { from, to },
    });
}

export function createTimeEntry(
    userId: number,
    data: { label: string; started_at: string; stopped_at?: string | null; duration_seconds: number; note?: string; color?: string }
): Promise<AxiosResponse<TimeEntry>> {
    return api.post(`/users/${userId}/todos/time-entries`, data);
}

export function updateTimeEntry(
    userId: number,
    entryId: number,
    data: { label?: string; started_at?: string; stopped_at?: string; duration_seconds?: number; note?: string; color?: string }
): Promise<AxiosResponse<TimeEntry>> {
    return api.put(`/users/${userId}/todos/time-entries/${entryId}`, data);
}

export function deleteTimeEntry(
    userId: number,
    entryId: number
): Promise<AxiosResponse<void>> {
    return api.delete(`/users/${userId}/todos/time-entries/${entryId}`);
}
