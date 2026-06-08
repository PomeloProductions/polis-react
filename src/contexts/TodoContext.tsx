import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getTodoToday,
  getTodoNavigate,
  getTodoHierarchy,
  getTodoResolve,
  getTodoSettings,
  updateTodoSettings,
  getBalances,
} from '../services/requests/TodoRequests';
import { UserPage } from '../models/user/user-page';
import { TodoSetting, TodoHierarchy, TodoBalance } from '../models/user/todo';
import { MeContext } from './MeContext';

interface TodoContextState {
  currentPage: UserPage | null;
  balances: TodoBalance[];
  hierarchy: TodoHierarchy | null;
  settings: TodoSetting | null;
  loading: boolean;
  goToDate: (date: string, level?: string) => Promise<void>;
  goToSlug: (slug: string) => Promise<void>;
  silentRefresh: () => Promise<void>;
  prevDay: () => Promise<void>;
  nextDay: () => Promise<void>;
  refreshToday: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  loadHierarchy: (year: number) => Promise<void>;
  updateSettings: (data: Partial<TodoSetting>) => Promise<void>;
}

const defaultState: TodoContextState = {
  currentPage: null,
  balances: [],
  hierarchy: null,
  silentRefresh: async () => {},
  settings: null,
  loading: true,
  goToDate: async () => {},
  goToSlug: async () => {},
  prevDay: async () => {},
  nextDay: async () => {},
  refreshToday: async () => {},
  refreshBalances: async () => {},
  loadHierarchy: async () => {},
  updateSettings: async () => {},
};

export const TodoContext = createContext<TodoContextState>(defaultState);

interface Props {
  children: React.ReactNode;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export const TodoContextProvider: React.FC<Props> = ({ children }) => {
  const { me } = useContext(MeContext);
  const [currentPage, setCurrentPage] = useState<UserPage | null>(null);
  const [balances, setBalances] = useState<TodoBalance[]>([]);
  const [hierarchy, setHierarchy] = useState<TodoHierarchy | null>(null);
  const [settings, setSettings] = useState<TodoSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [hierarchyCache, setHierarchyCache] = useState<Record<number, TodoHierarchy>>({});

  const setPageFromResponse = useCallback((data: any) => {
    const { balances: pageBalances, ...page } = data;
    setCurrentPage(page as UserPage);
    if (pageBalances) setBalances(pageBalances);
  }, []);

  const refreshToday = useCallback(async () => {
    if (!me?.id) return;
    try {
      setLoading(true);
      const [todayRes, settingsRes] = await Promise.all([
        getTodoToday(me.id),
        getTodoSettings(me.id),
      ]);
      setPageFromResponse(todayRes.data);
      setSettings(settingsRes.data);
    } catch (e) {
      console.error('Failed to load todo data', e);
    } finally {
      setLoading(false);
    }
  }, [me?.id, setPageFromResponse]);

  // Load settings on mount (but don't auto-load today — let the page component decide)
  useEffect(() => {
    if (!me?.id) return;
    getTodoSettings(me.id)
      .then((res) => setSettings(res.data))
      .catch((e) => console.error('Failed to load settings', e));
  }, [me?.id]);

  const goToDate = useCallback(
    async (date: string, level: string = 'day') => {
      if (!me?.id) return;
      try {
        setLoading(true);
        const response = await getTodoNavigate(me.id, level, date);
        setPageFromResponse(response.data);
      } catch (e) {
        console.error('Failed to navigate', e);
      } finally {
        setLoading(false);
      }
    },
    [me?.id, setPageFromResponse],
  );

  const goToSlug = useCallback(
    async (slug: string) => {
      if (!me?.id) return;
      try {
        setLoading(true);
        const response = await getTodoResolve(me.id, slug);
        setPageFromResponse(response.data);
      } catch (e) {
        console.error('Failed to resolve slug', e);
      } finally {
        setLoading(false);
      }
    },
    [me?.id, setPageFromResponse],
  );

  const silentRefresh = useCallback(async () => {
    if (!me?.id) return;
    try {
      // If we're on a day page and the day has changed, load today instead
      const pageConfig = currentPage?.config_json as Record<string, unknown> | undefined;
      const pageDate = pageConfig?.todo_date as string | undefined;
      const todayStr = new Date().toISOString().split('T')[0];
      if (pageDate && pageDate !== todayStr && pageConfig?.todo_level === 'day') {
        const response = await getTodoNavigate(me.id, 'day', todayStr);
        setPageFromResponse(response.data);
      } else if (currentPage?.slug) {
        const response = await getTodoResolve(me.id, currentPage.slug);
        setPageFromResponse(response.data);
      }
    } catch (e) {
      console.error('Failed to silently refresh', e);
    }
  }, [me?.id, currentPage?.slug, currentPage?.config_json, setPageFromResponse]);

  const refreshBalances = useCallback(async () => {
    if (!me?.id) return;
    try {
      const res = await getBalances(me.id);
      setBalances(res.data.data);
    } catch (e) {
      console.error('Failed to refresh balances', e);
    }
  }, [me?.id]);

  const currentDate = (currentPage?.config_json as Record<string, unknown>)?.todo_date as
    | string
    | undefined;

  const prevDay = useCallback(async () => {
    if (!currentDate) return;
    await goToDate(addDays(currentDate, -1));
  }, [currentDate, goToDate]);

  const nextDay = useCallback(async () => {
    if (!currentDate) return;
    await goToDate(addDays(currentDate, 1));
  }, [currentDate, goToDate]);

  const loadHierarchy = useCallback(
    async (year: number) => {
      if (!me?.id) return;
      if (hierarchyCache[year]) {
        setHierarchy(hierarchyCache[year]);
        return;
      }
      try {
        const response = await getTodoHierarchy(me.id, year);
        setHierarchy(response.data);
        setHierarchyCache((prev) => ({ ...prev, [year]: response.data }));
      } catch (e) {
        console.error('Failed to load hierarchy', e);
      }
    },
    [me?.id, hierarchyCache],
  );

  const handleUpdateSettings = useCallback(
    async (data: Partial<TodoSetting>) => {
      if (!me?.id) return;
      try {
        const response = await updateTodoSettings(me.id, data);
        setSettings(response.data);
      } catch (e) {
        console.error('Failed to update settings', e);
      }
    },
    [me?.id],
  );

  return (
    <TodoContext.Provider
      value={{
        currentPage,
        balances,
        hierarchy,
        settings,
        loading,
        goToDate,
        goToSlug,
        silentRefresh,
        prevDay,
        nextDay,
        refreshToday,
        refreshBalances,
        loadHierarchy,
        updateSettings: handleUpdateSettings,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
};
