export interface SubItem {
  id: string;
  text: string;
  completed?: boolean;
}

export interface TodoTaskNode {
  id: string;
  /**
   * priority_group: a rotation slot under a rotating node — an ordinary child that groups
   * items. Any direct child of a rotating node acts as a slot (priority_group, bare
   * line_item task, or a nested rotating).
   */
  task_type: 'category' | 'rotating' | 'line_item' | 'priority_group';
  label: string;
  description?: string;
  collapsed?: boolean;

  // Shared fields
  tally?: number;
  tally_step?: number;
  schedule?: number[];
  on_copy?: 'increment' | 'preserve' | 'reset' | 'omit';
  time_budget_hours?: number;
  logged_hours?: number;
  deficit?: number;

  // Container fields (categories, rotating slots, priority_group items)
  children?: TodoTaskNode[];

  // Rotating fields
  logged_time?: number;
  cascade_ratio?: number; // default 2 — base for cascade reset (2^n pattern becomes ratio^n)
  /** Rotation-cycle count for a slot (any direct child of a rotating node). Signed —
   *  cascade resets legitimately drive it negative. */
  count_this_group?: number;

  // Line item fields
  completed?: boolean;
  last_date?: string;
  sub_items?: SubItem[];

  // Behavior
  tracking_mode?: 'units' | 'hours'; // default 'units' — units use tally count, hours use tally as hour balance
  decrement_on_done?: boolean; // default true — if false, mark-done won't reduce tally
  time_tracking_mode?: 'reset' | 'accumulative'; // default 'reset' — reset each session or accumulate

  // Display options
  show_checkmark?: boolean; // Show mark-done checkmark and last_date on line items

  // Balance FK — links hours-mode nodes to their authoritative TodoBalance record
  todo_balance_id?: number;

  // Calendar rules — named calendars with add/subtract composition
  calendar_rules?: { calendar_id: number; calendar_name: string; mode: 'add' | 'subtract' }[];

  /** Transient PATCH flag (never a persisted field): marks this children-patch as a mark-off,
   *  triggering the server's atomic timer-split / session-complete / bank sequence. */
  _mark_off?: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WORKDAYS = [1, 2, 3, 4, 5];

export function updateNodeAtPath(
  root: TodoTaskNode,
  path: number[],
  patch: Partial<TodoTaskNode>,
): TodoTaskNode {
  if (path.length === 0) {
    return { ...root, ...patch };
  }

  const [head, ...rest] = path;
  const children = [...(root.children ?? [])];
  children[head] = updateNodeAtPath(children[head], rest, patch);
  return { ...root, children };
}

export function removeNodeAtPath(root: TodoTaskNode, path: number[]): TodoTaskNode {
  if (path.length === 0) return root;
  if (path.length === 1) {
    const children = [...(root.children ?? [])];
    children.splice(path[0], 1);
    return { ...root, children };
  }

  const [head, ...rest] = path;
  const children = [...(root.children ?? [])];
  children[head] = removeNodeAtPath(children[head], rest);
  return { ...root, children };
}

export function addChildAtPath(
  root: TodoTaskNode,
  path: number[],
  child: TodoTaskNode,
): TodoTaskNode {
  if (path.length === 0) {
    return { ...root, children: [...(root.children ?? []), child] };
  }

  const [head, ...rest] = path;
  const children = [...(root.children ?? [])];
  children[head] = addChildAtPath(children[head], rest, child);
  return { ...root, children };
}

/** Find a node by its id (client_id) anywhere in the tree. Returns the node and its real path —
 *  slots and slot items are ordinary children now, so every node has an addressable path. */
export function findNodeById(
  root: TodoTaskNode,
  id: string,
  currentPath: number[] = [],
): { node: TodoTaskNode; path: number[] } | null {
  if (root.id === id) return { node: root, path: currentPath };
  if (root.children) {
    for (let i = 0; i < root.children.length; i++) {
      const result = findNodeById(root.children[i], id, [...currentPath, i]);
      if (result) return result;
    }
  }
  return null;
}

/** Remove a child at the given index from the parent at the given path, returning the updated root and removed node. */
export function removeChildAtPath(
  root: TodoTaskNode,
  parentPath: number[],
  childIndex: number,
): { root: TodoTaskNode; removed: TodoTaskNode } | null {
  const parent = parentPath.length === 0 ? root : getNodeAtPath(root, parentPath);
  if (!parent?.children || childIndex < 0 || childIndex >= parent.children.length) return null;
  const removed = parent.children[childIndex];
  const newChildren = parent.children.filter((_, i) => i !== childIndex);
  const updatedRoot = updateNodeAtPath(root, parentPath, { children: newChildren });
  return { root: updatedRoot, removed };
}

/** Nest a node into a target node by ID — converts target to category if needed, appends node as child. */
export function nestNodeInto(
  root: TodoTaskNode,
  targetId: string,
  nodeToNest: TodoTaskNode,
): TodoTaskNode {
  const transform = (n: TodoTaskNode): TodoTaskNode => {
    if (n.id === targetId) {
      return {
        ...n,
        task_type: 'category',
        children: [...(n.children ?? []), nodeToNest],
      };
    }
    if (n.children) {
      return { ...n, children: n.children.map(transform) };
    }
    return n;
  };
  return transform(root);
}

export function moveChildAtPath(
  root: TodoTaskNode,
  path: number[],
  direction: 'up' | 'down',
): TodoTaskNode {
  if (path.length === 0) return root;

  const parentPath = path.slice(0, -1);
  const childIdx = path[path.length - 1];

  const getNode = (node: TodoTaskNode, p: number[]): TodoTaskNode => {
    if (p.length === 0) return node;
    return getNode((node.children ?? [])[p[0]], p.slice(1));
  };

  const parent = getNode(root, parentPath);
  const children = [...(parent.children ?? [])];
  const newIdx = direction === 'up' ? childIdx - 1 : childIdx + 1;
  if (newIdx < 0 || newIdx >= children.length) return root;

  [children[childIdx], children[newIdx]] = [children[newIdx], children[childIdx]];
  return updateNodeAtPath(root, parentPath, { children } as Partial<TodoTaskNode>);
}

/**
 * The single source of truth for a node's tracking mode when it isn't explicitly set.
 * Backend, renderer, drawer and summaries must all agree on this — historically the drawer
 * defaulted undefined to 'hours' while everything else treated undefined as 'units', which made
 * the settings drawer misrepresent units nodes as hours.
 */
export const DEFAULT_TRACKING_MODE: 'units' | 'hours' = 'hours';

/** Resolve a node's tracking mode, applying the shared default when unset. Use everywhere. */
export function getTrackingMode(node: {
  tracking_mode?: 'units' | 'hours' | null;
}): 'units' | 'hours' {
  return node.tracking_mode ?? DEFAULT_TRACKING_MODE;
}

/** Whether a node has its own tracking configured (not just a pure container). */
export function hasOwnTracking(node: TodoTaskNode): boolean {
  return (
    getTrackingMode(node) === 'hours' ||
    ((node.tally_step ?? 0) > 0 && (node.time_budget_hours ?? 0) > 0)
  );
}

/** Compute the aggregate tally for a category (sum of children's tallies + own if tracked). */
export function computeTotalTally(node: TodoTaskNode): number {
  if (node.task_type === 'category' && node.children && node.children.length > 0) {
    const childSum = node.children.reduce((sum, child) => sum + computeTotalTally(child), 0);
    return (hasOwnTracking(node) ? (node.tally ?? 0) : 0) + childSum;
  }
  return node.tally ?? 0;
}

/** Compute the daily budget for a category (sum of children's per-day hours + own if tracked). */
export function computeDailyBudget(node: TodoTaskNode): number {
  if (node.task_type === 'category' && node.children && node.children.length > 0) {
    const childSum = node.children.reduce((sum, child) => sum + computeDailyBudget(child), 0);
    const ownBudget = hasOwnTracking(node)
      ? getTrackingMode(node) === 'hours'
        ? (node.tally_step ?? 0)
        : (node.time_budget_hours ?? 0)
      : 0;
    return ownBudget + childSum;
  }
  // Hours mode: tally_step IS the daily hours
  if (getTrackingMode(node) === 'hours') return node.tally_step ?? 0;
  return node.time_budget_hours ?? 0;
}

/** Map of todo_balance_id → balance value, built from TodoBalance[] API data. */
export type BalanceMap = Map<number, number>;

export function buildBalanceMap(balances: Array<{ id: number; balance: number }>): BalanceMap {
  const map = new Map<number, number>();
  for (const b of balances) {
    map.set(b.id, Number(b.balance));
  }
  return map;
}

export function computeTotals(
  node: TodoTaskNode,
  overrideTally?: number,
  balanceMap?: BalanceMap,
): {
  totalBudgetHours: number;
  totalLoggedHours: number;
  totalDeficit: number;
  /**
   * Logged time that should CREDIT a budget-based deficit, summed per-child per-mode:
   *  - hours-mode nodes contribute 0 — their deficit is the balance, which already includes
   *    logged time (adding it again double-counts, e.g. a parent showing -0:17 while its
   *    children summed to -0:28).
   *  - units/rotating nodes contribute their logged time capped at the per-session allotment
   *    (time_budget_hours), so over-allotment time never credits the balance.
   */
  totalSpentCredit: number;
} {
  // Step 1: Aggregate children totals for categories
  let childBudget = 0,
    childLogged = 0,
    childDeficit = 0,
    childCredit = 0;
  if (node.task_type === 'category' && node.children && node.children.length > 0) {
    for (const child of node.children) {
      const ct = computeTotals(child, undefined, balanceMap);
      childBudget += ct.totalBudgetHours;
      childLogged += ct.totalLoggedHours;
      childDeficit += ct.totalDeficit;
      childCredit += ct.totalSpentCredit;
    }
  }

  // Step 2: If category without own tracking, return children-only (current behavior)
  if (node.task_type === 'category' && !hasOwnTracking(node)) {
    return {
      totalBudgetHours: childBudget,
      totalLoggedHours: childLogged,
      totalDeficit: childDeficit,
      totalSpentCredit: childCredit,
    };
  }

  // Step 3: Compute own totals
  const isHoursMode = getTrackingMode(node) === 'hours';
  const effectiveTally =
    overrideTally ??
    (isHoursMode && node.todo_balance_id && balanceMap?.has(node.todo_balance_id)
      ? balanceMap.get(node.todo_balance_id)!
      : (node.tally ?? 0));

  // Rotating nodes store logged time in logged_time; everything else in logged_hours. Using
  // `logged_hours ?? logged_time` breaks for rotating nodes (logged_hours is 0, not null, so it
  // shadows logged_time) — which made category totals omit rotating children's logged time.
  const ownLogged =
    node.task_type === 'rotating' ? (node.logged_time ?? 0) : (node.logged_hours ?? 0);
  const perSessionAllotment = node.time_budget_hours ?? 0;
  const ownCredit = isHoursMode
    ? 0
    : perSessionAllotment > 0
      ? Math.min(ownLogged, perSessionAllotment)
      : ownLogged;

  let ownBudget = 0,
    ownDeficit = 0;
  if (isHoursMode) {
    ownDeficit = -effectiveTally;
  } else {
    const budgetPerUnit = node.time_budget_hours ?? 0;
    ownBudget = effectiveTally * budgetPerUnit;
    ownDeficit = -ownBudget;
  }

  // Step 4: For tracked categories, combine own + children
  if (node.task_type === 'category') {
    return {
      totalBudgetHours: ownBudget + childBudget,
      totalLoggedHours: ownLogged + childLogged,
      totalDeficit: ownDeficit + childDeficit,
      totalSpentCredit: ownCredit + childCredit,
    };
  }

  return {
    totalBudgetHours: ownBudget,
    totalLoggedHours: ownLogged,
    totalDeficit: ownDeficit,
    totalSpentCredit: ownCredit,
  };
}

export function scheduleToString(
  schedule?: number[],
  calendarRules?: TodoTaskNode['calendar_rules'],
): string {
  // If calendar rules exist, show calendar names
  if (calendarRules && calendarRules.length > 0) {
    const parts: string[] = [];
    for (const rule of calendarRules) {
      parts.push(rule.mode === 'subtract' ? `- ${rule.calendar_name}` : rule.calendar_name);
    }
    return parts.join(', ');
  }
  if (!schedule || schedule.length === 0) return '';
  const sorted = [...schedule].sort((a, b) => a - b);
  if (sorted.length === 7) return 'everyday';
  if (sorted.length === 5 && sorted.every((d, i) => d === WORKDAYS[i])) return 'M-F';
  if (sorted.length === 6 && !sorted.includes(0)) return 'Mon-Sat';
  return sorted.map((d) => DAY_LABELS[d]).join(', ');
}

/** Format decimal hours as h:mm (e.g., 12.54 → "12:32", 0.25 → "0:15") */
export function formatHoursHHMM(hours: number): string {
  const totalMinutes = Math.round(Math.abs(hours) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const sign = hours < 0 ? '-' : '';
  return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Parse a HH:MM (or H:MM) string to decimal hours.
 * Also accepts plain decimal numbers as fallback.
 * Returns NaN if unparseable.
 */
/**
 * Format a last_date value for display. Handles both legacy "M-D" format and ISO timestamps.
 */
export function formatLastDate(lastDate?: string | null): string {
  if (!lastDate) return '—';
  const currentYear = new Date().getFullYear();
  // ISO timestamp (contains 'T')
  if (lastDate.includes('T')) {
    const d = new Date(lastDate);
    if (isNaN(d.getTime())) return lastDate;
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return d.getFullYear() !== currentYear ? `${m}-${day}-${d.getFullYear()}` : `${m}-${day}`;
  }
  // YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(lastDate)) {
    const parts = lastDate.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return y !== currentYear ? `${m}-${day}-${y}` : `${m}-${day}`;
  }
  // Legacy M-D format
  return lastDate;
}

/**
 * Parse a last_date to a comparable number (epoch ms for ISO, M*100+D for legacy).
 */
export function parseLastDate(lastDate?: string | null): number {
  if (!lastDate) return 0;
  if (lastDate.includes('T')) {
    const t = new Date(lastDate).getTime();
    return isNaN(t) ? 0 : t;
  }
  // Legacy M-D format
  const parts = lastDate.split('-');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 100 + parseInt(parts[1], 10);
}

export function parseHHMM(text: string): number {
  const trimmed = text.trim();
  const match = trimmed.match(/^([+-]?)(\d+):(\d{1,2})$/);
  if (match) {
    const sign = match[1] === '-' ? -1 : 1;
    const h = parseInt(match[2], 10);
    const m = parseInt(match[3], 10);
    return sign * (h + m / 60);
  }
  // Fallback: try parsing as decimal
  return parseFloat(trimmed);
}

export function formatTimeRemaining(budget: number, logged: number): string {
  const remaining = budget - logged;
  if (remaining < 0) {
    return `${formatHoursHHMM(Math.abs(remaining))} over`;
  }
  return `${formatHoursHHMM(remaining)} remaining`;
}

export function formatDeficit(deficit: number): string {
  if (deficit === 0) return '';
  if (deficit > 0) return `+${formatHoursHHMM(deficit)} surplus`;
  return `${formatHoursHHMM(deficit)} deficit`;
}

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createEmptyNode(
  taskType: 'category' | 'rotating' | 'line_item' | 'priority_group',
  label = 'New Task',
): TodoTaskNode {
  const base: TodoTaskNode = {
    id: makeId('tn'),
    task_type: taskType,
    label,
    on_copy: 'increment',
  };

  if (taskType === 'category') {
    base.children = [];
  } else if (taskType === 'rotating') {
    // Slots are ordinary children: start with two priority groups
    base.children = [
      {
        id: makeId('pg'),
        task_type: 'priority_group',
        label: 'Priority',
        count_this_group: 0,
        on_copy: 'preserve',
        children: [],
      },
      {
        id: makeId('pg'),
        task_type: 'priority_group',
        label: 'Priority',
        count_this_group: 0,
        on_copy: 'preserve',
        children: [],
      },
    ];
    base.tally = 0;
    base.tally_step = 1;
  } else if (taskType === 'priority_group') {
    base.children = [];
    base.count_this_group = 0;
    base.on_copy = 'preserve';
  } else {
    base.completed = false;
    base.sub_items = [];
    base.tracking_mode = DEFAULT_TRACKING_MODE;
  }

  return base;
}

/**
 * Get a node at a given path.
 */
export function getNodeAtPath(root: TodoTaskNode, path: number[]): TodoTaskNode {
  let node = root;
  for (const idx of path) {
    node = (node.children ?? [])[idx];
  }
  return node;
}

/**
 * Move a child node from one parent to another (or reorder within the same parent).
 * srcParentPath/dstParentPath are paths to the category nodes.
 * srcIndex/dstIndex are indices within those categories' children arrays.
 */
export function moveNode(
  root: TodoTaskNode,
  srcParentPath: number[],
  srcIndex: number,
  dstParentPath: number[],
  dstIndex: number,
): TodoTaskNode {
  // Same parent — simple reorder
  if (srcParentPath.join('.') === dstParentPath.join('.')) {
    const parent = getNodeAtPath(root, srcParentPath);
    const children = [...(parent.children ?? [])];
    const [moved] = children.splice(srcIndex, 1);
    children.splice(dstIndex, 0, moved);
    return updateNodeAtPath(root, srcParentPath, { children } as Partial<TodoTaskNode>);
  }

  // Cross-parent move: remove from source first, then insert at destination
  const srcParent = getNodeAtPath(root, srcParentPath);
  const srcChildren = [...(srcParent.children ?? [])];
  const [moved] = srcChildren.splice(srcIndex, 1);

  // Update root with source removal
  let updated = updateNodeAtPath(root, srcParentPath, {
    children: srcChildren,
  } as Partial<TodoTaskNode>);

  // After removal, destination indices may have shifted if dst is a descendant of src
  // or shares a parent. Re-fetch destination parent from the updated tree.
  const dstParent = getNodeAtPath(updated, dstParentPath);
  const dstChildren = [...(dstParent.children ?? [])];
  dstChildren.splice(dstIndex, 0, moved);

  updated = updateNodeAtPath(updated, dstParentPath, {
    children: dstChildren,
  } as Partial<TodoTaskNode>);
  return updated;
}

// ============================================================================
// Rotation slots — a rotating node's slots are its direct children, in order.
// Each slot is a priority_group (items inside), a bare task, or a nested rotating.
// ============================================================================

/**
 * Normalize slot rotation counts under the (possibly new) quota structure. Call whenever the
 * NUMBER of slots changes: count_this_group values are cycle positions relative to quotas of
 * ratio^(n-1-i), so a different n re-defines what they mean.
 *
 * Cycles that are ALREADY COMPLETE under the new structure play out (the cascade reset that
 * "would have marked off before"); genuine mid-cycle progress is preserved unchanged — e.g.
 * (1,0) stays (1,0), while leftover (4,2) under 2-slot quotas (2,1) resolves to (0,0).
 */
export function normalizeSlotCycle(
  slots: TodoTaskNode[],
  cascadeRatio: number = 2,
): TodoTaskNode[] {
  const n = slots.length;
  if (n === 0) return slots;
  const quotas = slots.map((_, i) => Math.pow(cascadeRatio, n - 1 - i));
  let counts = slots.map((s) => s.count_this_group ?? 0);
  while (counts.every((c, i) => c >= quotas[i])) {
    counts = counts.map((c, i) => c - quotas[i]);
  }
  return slots.map((s, i) => ({ ...s, count_this_group: counts[i] }));
}

/**
 * The slot currently due for focus. Slot 0 is the pacemaker: with ratio R, slot[i] earns a turn
 * for every R^i completions of SLOT 0 — never of its immediate neighbor, so an out-of-order
 * completion in a middle slot can't fund a turn for the slot below it. Scan top-down so the
 * highest-priority due slot wins, producing the interleaved cascade (#1 #1 #2 #1 #1 #2 #3 for
 * ratio 2 with 3 slots). Returns the slot's client id.
 */
export function getCurrentSlotId(
  slots: TodoTaskNode[],
  cascadeRatio: number = 2,
): string | undefined {
  if (slots.length === 0) return undefined;
  if (slots.length === 1) return slots[0].id;

  const pacemakerCount = slots[0].count_this_group ?? 0;
  for (let i = 1; i < slots.length; i++) {
    const earnedTurns = Math.floor(pacemakerCount / Math.pow(cascadeRatio, i));
    if ((slots[i].count_this_group ?? 0) < earnedTurns) {
      return slots[i].id;
    }
  }

  return slots[0].id;
}

/** Least-recently-done child of a priority_group slot (ties broken by lower tally). */
export function getNextItemIdInSlot(slot: TodoTaskNode): string | undefined {
  const items = slot.children ?? [];
  if (items.length === 0) return undefined;
  const oldest = items.reduce((best, item) => {
    const bestDate = parseLastDate(best.last_date);
    const itemDate = parseLastDate(item.last_date);
    if (itemDate !== bestDate) return itemDate < bestDate ? item : best;
    return (item.tally ?? 0) < (best.tally ?? 0) ? item : best;
  });
  return oldest.id;
}

/**
 * Resolve the focused slot chain and the actionable leaf item of a rotating node.
 *  - priority_group slot → its least-recently-done item is the leaf
 *  - bare task slot → the slot itself is the leaf
 *  - nested rotating slot → recurse
 */
export interface DeepNextResult {
  /** client_ids of the focused slot at each level, root-first */
  slotPath: string[];
  /** the actionable item to mark done */
  leafItemId?: string;
}

export function getDeepNextItem(rotating: TodoTaskNode): DeepNextResult | undefined {
  const slots = rotating.children ?? [];
  const slotId = getCurrentSlotId(slots, rotating.cascade_ratio ?? 2);
  if (!slotId) return undefined;
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) return undefined;

  if (slot.task_type === 'rotating' && (slot.children?.length ?? 0) > 0) {
    const sub = getDeepNextItem(slot);
    return {
      slotPath: [slotId, ...(sub?.slotPath ?? [])],
      leafItemId: sub?.leafItemId ?? slot.id,
    };
  }

  if (slot.task_type === 'priority_group' && (slot.children?.length ?? 0) > 0) {
    const itemId = getNextItemIdInSlot(slot);
    const item = slot.children!.find((c) => c.id === itemId);
    // A priority group's item may itself be a rotating node — drill into it, routing the
    // path THROUGH the item so mark-done can increment every level it passes.
    if (item && item.task_type === 'rotating' && (item.children?.length ?? 0) > 0) {
      const sub = getDeepNextItem(item);
      return {
        slotPath: [slotId, item.id, ...(sub?.slotPath ?? [])],
        leafItemId: sub?.leafItemId ?? item.id,
      };
    }
    return { slotPath: [slotId], leafItemId: itemId };
  }

  // Bare task slot (or empty group) — the slot itself is the completion target
  return { slotPath: [slotId], leafItemId: slot.id };
}

/**
 * Pure mark-done for a rotating node. Increments the focused slot's cycle count at every level
 * of slotPath, stamps the leaf (item last_date + tally for priority_group items; the slot's own
 * last_date for bare/group-level targets), and applies the cascade reset at each level whose
 * LAST slot completed (subtract ratio^(n-1-i) from every slot — counts may go negative, which
 * is legitimate). Returns the updated rotating node; callers patch `children` from it.
 */
export function applyMarkDone(
  container: TodoTaskNode,
  slotPath: string[],
  leafItemId?: string,
  nowIso?: string,
): TodoTaskNode {
  const now = nowIso ?? new Date().toISOString();
  const children = [...(container.children ?? [])];
  const [childId, ...restPath] = slotPath;
  const idx = children.findIndex((s) => s.id === childId);
  if (idx === -1) return container;

  // A rotating node marked through: its own completion bookkeeping — backlog tally decrements
  // (unless decrement_on_done is off) and its session-logged time banks to zero, matching what
  // a direct mark on that node would have patched.
  const stampRotating = (n: TodoTaskNode): TodoTaskNode => ({
    ...n,
    ...(n.decrement_on_done !== false && typeof n.tally === 'number' ? { tally: n.tally - 1 } : {}),
    logged_time: 0,
    logged_hours: 0,
  });

  // Routing through a priority group: slotPath[0] addresses one of its ITEMS (a nested
  // rotating). The group's own count/last_date are stamped by the PARENT rotating level;
  // here we recurse into the item and stamp ITS last_date so the group's
  // least-recently-done rotation moves past it (items rotate by date, not counts).
  if (container.task_type === 'priority_group') {
    children[idx] = {
      ...stampRotating(applyMarkDone(children[idx], restPath, leafItemId, now)),
      last_date: now,
    };
    return { ...container, children };
  }

  const ratio = container.cascade_ratio ?? 2;
  let slot = children[idx];

  if (
    restPath.length > 0 &&
    (slot.task_type === 'rotating' || slot.task_type === 'priority_group')
  ) {
    // Deeper levels first, then this slot's own count
    slot = applyMarkDone(slot, restPath, leafItemId, now);
    if (slot.task_type === 'rotating') {
      slot = stampRotating(slot);
    }
    slot = { ...slot, count_this_group: (slot.count_this_group ?? 0) + 1 };
    if (slot.task_type === 'priority_group') {
      // Marking through a group also stamps the group's last-done date
      slot = { ...slot, last_date: now };
    }
  } else if (
    slot.task_type === 'priority_group' &&
    leafItemId &&
    leafItemId !== slot.id &&
    slot.children
  ) {
    slot = {
      ...slot,
      count_this_group: (slot.count_this_group ?? 0) + 1,
      children: slot.children.map((it) =>
        it.id === leafItemId ? { ...it, last_date: now, tally: (it.tally ?? 0) + 1 } : it,
      ),
    };
  } else {
    // Bare task slot / group-level target — the slot itself is stamped
    slot = { ...slot, count_this_group: (slot.count_this_group ?? 0) + 1, last_date: now };
  }
  children[idx] = slot;

  let result = children;
  if (idx === children.length - 1 && children.length > 1) {
    const n = result.length;
    result = result.map((s, i) => ({
      ...s,
      count_this_group: (s.count_this_group ?? 0) - Math.pow(ratio, n - 1 - i),
    }));
  }

  return { ...container, children: result };
}
