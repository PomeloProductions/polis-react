/**
 * The SPACE-ASSIGNMENT model — which plugin deliverables an end user has placed
 * into which customizable space, and in what order.
 *
 * This is the user-configurable customization layer that sits on top of the
 * manifest. The manifest says where a deliverable *may* go (its default space);
 * the assignment says what the *user* actually wants rendered in each space, and
 * how it is arranged. Keeping the two separate lets a user disable a deliverable,
 * reorder deliverables within a space, or (in a consumer that allows it) move a
 * deliverable to a different space than its manifest default.
 *
 * Persistence is intentionally abstracted behind {@link SpaceAssignmentStore} so
 * this stays generic: a consumer can back it with the UserPage/settings
 * mechanism, a dedicated endpoint, or localStorage — the rendering surface does
 * not care.
 */

/** One placed deliverable within a space. */
export interface SpaceAssignment {
  /** The plugin slug the deliverable belongs to. */
  pluginSlug: string;
  /** The `component_type` the deliverable registers (matches the manifest). */
  component: string;
  /** Sort order within the space, ascending. Defaults to 0. */
  order?: number;
  /** Whether this placement is currently enabled. Defaults to true. */
  enabled?: boolean;
  /**
   * Per-placement config overrides for the deliverable, passed to the rendered
   * component. Merged over the plugin's defaults by the consumer if desired.
   */
  config?: Record<string, unknown>;
}

/**
 * The full set of a user's space assignments, keyed by space slug. Absent keys
 * mean "no user-placed deliverables in that space".
 */
export type SpaceAssignmentMap = Record<string, SpaceAssignment[]>;

/**
 * Pluggable persistence for a user's space assignments. A consumer provides an
 * implementation (e.g. wired to UserPageRequests / a settings endpoint). The
 * default export {@link memorySpaceAssignmentStore} is in-memory only — fine for
 * tests and for consumers that have not wired real persistence yet.
 */
export interface SpaceAssignmentStore {
  /** Load the full assignment map for a user. */
  load(userId: number): Promise<SpaceAssignmentMap>;
  /** Persist the full assignment map for a user. */
  save(userId: number, map: SpaceAssignmentMap): Promise<void>;
}

/** Deep-ish clone of an assignment map (plain data only). */
function cloneMap(map: SpaceAssignmentMap): SpaceAssignmentMap {
  const out: SpaceAssignmentMap = {};
  for (const [space, list] of Object.entries(map)) {
    out[space] = list.map((a) => ({ ...a, ...(a.config ? { config: { ...a.config } } : {}) }));
  }
  return out;
}

/**
 * Create an in-memory {@link SpaceAssignmentStore}. State lives for the lifetime
 * of the returned object. Seed it with initial data for tests.
 */
export function createMemorySpaceAssignmentStore(
  seed: Record<number, SpaceAssignmentMap> = {},
): SpaceAssignmentStore {
  const byUser = new Map<number, SpaceAssignmentMap>();
  for (const [userId, map] of Object.entries(seed)) {
    byUser.set(Number(userId), cloneMap(map));
  }
  return {
    async load(userId) {
      return cloneMap(byUser.get(userId) ?? {});
    },
    async save(userId, map) {
      byUser.set(userId, cloneMap(map));
    },
  };
}

/** A shared in-memory store for consumers that have not wired persistence yet. */
export const memorySpaceAssignmentStore = createMemorySpaceAssignmentStore();

/**
 * Sort + filter the deliverables a space should render for a user: enabled
 * assignments for `space`, ordered ascending by `order` (ties keep input order).
 * Returns a fresh array.
 */
export function assignmentsForSpace(map: SpaceAssignmentMap, space: string): SpaceAssignment[] {
  const list = map[space] ?? [];
  return list
    .filter((a) => a.enabled !== false)
    .map((a, index) => ({ a, index }))
    .sort((x, y) => (x.a.order ?? 0) - (y.a.order ?? 0) || x.index - y.index)
    .map(({ a }) => a);
}
