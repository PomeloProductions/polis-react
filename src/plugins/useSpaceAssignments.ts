import { useCallback, useEffect, useState } from 'react';
import {
  assignmentsForSpace,
  memorySpaceAssignmentStore,
  type SpaceAssignment,
  type SpaceAssignmentMap,
  type SpaceAssignmentStore,
} from './space-model';

/**
 * Hook over a {@link SpaceAssignmentStore} that loads a user's full space-
 * assignment map and exposes helpers to read + mutate it. Generic: the backing
 * store is injected (defaults to the in-memory store), so this is not coupled to
 * any one app's persistence.
 *
 * Mutations are optimistic (local state updates immediately) and persisted via
 * the store's `save`. The whole map is saved on each mutation, which keeps the
 * store contract minimal (load/save) — fine for the small per-user payload.
 */
export interface UseSpaceAssignments {
  /** The full map, keyed by space slug. */
  map: SpaceAssignmentMap;
  /** Loading the initial map. */
  loading: boolean;
  /** Load error, if any. */
  error: string | null;
  /** Enabled, ordered deliverables for one space. */
  forSpace: (space: string) => SpaceAssignment[];
  /** Replace all assignments for a space (persists). */
  setSpace: (space: string, assignments: SpaceAssignment[]) => Promise<void>;
  /** Append a deliverable to a space (persists). */
  addToSpace: (space: string, assignment: SpaceAssignment) => Promise<void>;
  /** Remove a deliverable (by plugin slug + component) from a space (persists). */
  removeFromSpace: (space: string, pluginSlug: string, component: string) => Promise<void>;
  /** Reload from the store, discarding unsaved local state. */
  reload: () => Promise<void>;
}

export function useSpaceAssignments(
  userId: number | undefined,
  store: SpaceAssignmentStore = memorySpaceAssignmentStore,
): UseSpaceAssignments {
  const [map, setMap] = useState<SpaceAssignmentMap>({});
  const [loading, setLoading] = useState<boolean>(userId != null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (userId == null) {
      setMap({});
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const loaded = await store.load(userId);
      setMap(loaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [userId, store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const persist = useCallback(
    async (next: SpaceAssignmentMap) => {
      setMap(next);
      if (userId == null) return;
      try {
        await store.save(userId, next);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [userId, store],
  );

  const setSpace = useCallback(
    async (space: string, assignments: SpaceAssignment[]) => {
      await persist({ ...map, [space]: assignments });
    },
    [map, persist],
  );

  const addToSpace = useCallback(
    async (space: string, assignment: SpaceAssignment) => {
      const current = map[space] ?? [];
      await persist({ ...map, [space]: [...current, assignment] });
    },
    [map, persist],
  );

  const removeFromSpace = useCallback(
    async (space: string, pluginSlug: string, component: string) => {
      const current = map[space] ?? [];
      const next = current.filter(
        (a) => !(a.pluginSlug === pluginSlug && a.component === component),
      );
      await persist({ ...map, [space]: next });
    },
    [map, persist],
  );

  const forSpace = useCallback((space: string) => assignmentsForSpace(map, space), [map]);

  return { map, loading, error, forSpace, setSpace, addToSpace, removeFromSpace, reload };
}
