export interface SubItem {
    id: string;
    text: string;
    completed?: boolean;
}

export interface RotatingItem {
    id: string;
    text: string;
    last_date?: string;
    on_copy?: string;
    count?: number; // per-item counter
}

export interface RotatingGroup {
    group_number: number;
    label?: string;
    count_this_group: number;
    on_copy?: 'preserve' | 'increment';
    children: TodoTaskNode[]; // child nodes — can be line_items, rotating (nested priority), or categories
    last_date?: string;
    mark_done_on_group?: boolean;
    cascade_ratio?: number; // default 2 — base for cascade reset within this group
}

export interface TodoTaskNode {
    id: string;
    task_type: 'category' | 'rotating' | 'line_item';
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

    // Category fields
    children?: TodoTaskNode[];

    // Rotating fields
    groups?: RotatingGroup[];
    custom_groups?: boolean;
    logged_time?: number;
    cascade_ratio?: number; // default 2 — base for cascade reset (2^n pattern becomes ratio^n)

    // Line item fields
    completed?: boolean;
    last_date?: string;
    sub_items?: SubItem[];

    // Behavior
    tracking_mode?: 'units' | 'hours'; // default 'units' — units use tally count, hours use tally as hour balance
    decrement_on_done?: boolean; // default true — if false, mark-done won't reduce tally
    time_tracking_mode?: 'reset' | 'accumulative'; // default 'reset' — reset each session or accumulate

    // Balance FK — links hours-mode nodes to their authoritative TodoBalance record
    todo_balance_id?: number;
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

export function removeNodeAtPath(
    root: TodoTaskNode,
    path: number[],
): TodoTaskNode {
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

/** Whether a node has its own tracking configured (not just a pure container). */
export function hasOwnTracking(node: TodoTaskNode): boolean {
    return node.tracking_mode === 'hours'
        || ((node.tally_step ?? 0) > 0 && (node.time_budget_hours ?? 0) > 0);
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
            ? (node.tracking_mode === 'hours' ? (node.tally_step ?? 0) : (node.time_budget_hours ?? 0))
            : 0;
        return ownBudget + childSum;
    }
    // Hours mode: tally_step IS the daily hours
    if (node.tracking_mode === 'hours') return node.tally_step ?? 0;
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

export function computeTotals(node: TodoTaskNode, overrideTally?: number, balanceMap?: BalanceMap): {
    totalBudgetHours: number;
    totalLoggedHours: number;
    totalDeficit: number;
} {
    // Step 1: Aggregate children totals for categories
    let childBudget = 0, childLogged = 0, childDeficit = 0;
    if (node.task_type === 'category' && node.children && node.children.length > 0) {
        for (const child of node.children) {
            const ct = computeTotals(child, undefined, balanceMap);
            childBudget += ct.totalBudgetHours;
            childLogged += ct.totalLoggedHours;
            childDeficit += ct.totalDeficit;
        }
    }

    // Step 2: If category without own tracking, return children-only (current behavior)
    if (node.task_type === 'category' && !hasOwnTracking(node)) {
        return { totalBudgetHours: childBudget, totalLoggedHours: childLogged, totalDeficit: childDeficit };
    }

    // Step 3: Compute own totals
    const isHoursMode = node.tracking_mode === 'hours';
    const effectiveTally = overrideTally
        ?? (isHoursMode && node.todo_balance_id && balanceMap?.has(node.todo_balance_id)
            ? balanceMap.get(node.todo_balance_id)!
            : (node.tally ?? 0));

    let ownBudget = 0, ownLogged = 0, ownDeficit = 0;
    if (isHoursMode) {
        ownLogged = node.logged_hours ?? node.logged_time ?? 0;
        ownDeficit = -effectiveTally;
    } else {
        const budgetPerUnit = node.time_budget_hours ?? 0;
        ownBudget = effectiveTally * budgetPerUnit;
        ownLogged = node.logged_hours ?? node.logged_time ?? 0;
        ownDeficit = -ownBudget;
    }

    // Step 4: For tracked categories, combine own + children
    if (node.task_type === 'category') {
        return {
            totalBudgetHours: ownBudget + childBudget,
            totalLoggedHours: ownLogged + childLogged,
            totalDeficit: ownDeficit + childDeficit,
        };
    }

    return { totalBudgetHours: ownBudget, totalLoggedHours: ownLogged, totalDeficit: ownDeficit };
}

export function scheduleToString(schedule?: number[]): string {
    if (!schedule || schedule.length === 0) return '';
    const sorted = [...schedule].sort((a, b) => a - b);
    if (sorted.length === 7) return 'everyday';
    if (sorted.length === 5 && sorted.every((d, i) => d === WORKDAYS[i])) return 'M-F';
    if (sorted.length === 6 && !sorted.includes(0)) return 'Mon-Sat';
    return sorted.map((d) => DAY_LABELS[d]).join(', ');
}

/** Format decimal hours as h:mm (e.g., 12.54 → "12:32", 0.25 → "0:15") */
export function formatHoursHHMM(hours: number): string {
    const abs = Math.abs(hours);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
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
    // ISO timestamp (contains 'T')
    if (lastDate.includes('T')) {
        const d = new Date(lastDate);
        if (isNaN(d.getTime())) return lastDate;
        return `${d.getMonth() + 1}-${d.getDate()}`;
    }
    // YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(lastDate)) {
        const parts = lastDate.split('-');
        return `${parseInt(parts[1], 10)}-${parseInt(parts[2], 10)}`;
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

export function createEmptyNode(taskType: 'category' | 'rotating' | 'line_item', label = 'New Task'): TodoTaskNode {
    const base: TodoTaskNode = {
        id: makeId('tn'),
        task_type: taskType,
        label,
        on_copy: 'increment',
    };

    if (taskType === 'category') {
        base.children = [];
    } else if (taskType === 'rotating') {
        base.groups = [
            { group_number: 1, label: 'Priority', count_this_group: 0, on_copy: 'preserve', children: [] },
            { group_number: 2, label: 'Priority', count_this_group: 0, on_copy: 'preserve', children: [] },
        ];
        base.tally = 0;
        base.tally_step = 1;
        base.custom_groups = false;
    } else {
        base.completed = false;
        base.sub_items = [];
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
    let updated = updateNodeAtPath(root, srcParentPath, { children: srcChildren } as Partial<TodoTaskNode>);

    // After removal, destination indices may have shifted if dst is a descendant of src
    // or shares a parent. Re-fetch destination parent from the updated tree.
    const dstParent = getNodeAtPath(updated, dstParentPath);
    const dstChildren = [...(dstParent.children ?? [])];
    dstChildren.splice(dstIndex, 0, moved);

    updated = updateNodeAtPath(updated, dstParentPath, { children: dstChildren } as Partial<TodoTaskNode>);
    return updated;
}

/**
 * Distribute items evenly across N groups, preserving existing group metadata.
 */
export function distributeIntoGroups(
    items: TodoTaskNode[],
    numGroups: number,
    existingGroups: RotatingGroup[],
    defaultLabel: string,
): RotatingGroup[] {
    const n = Math.max(1, numGroups);
    const perGroup = Math.floor(items.length / n);
    const remainder = items.length % n;
    const result: RotatingGroup[] = [];
    let idx = 0;
    for (let i = 0; i < n; i++) {
        const count = perGroup + (i >= n - remainder ? 1 : 0);
        const existing = existingGroups[i];
        result.push({
            group_number: i + 1,
            label: existing?.label ?? defaultLabel,
            count_this_group: existing?.count_this_group ?? 0,
            on_copy: existing?.on_copy ?? 'preserve',
            children: items.slice(idx, idx + count),
        });
        idx += count;
    }
    return result;
}

/**
 * Get current group number using 2:1 rotation logic.
 * Group i+1 earns 1 turn for every 2 turns group i completes.
 * Pick the lowest-priority group that has earned but unused turns.
 * If none, group 1 (highest priority) gets focus.
 */
export function getCurrentGroupNum(groups: RotatingGroup[], cascadeRatio: number = 2): number | undefined {
    if (groups.length === 0) return undefined;
    if (groups.length === 1) return groups[0].group_number;

    // Check from lowest priority to highest — first group with earned unused turns wins
    // With ratio R: group[i] earns a turn for every R completions of group[i-1]
    for (let i = groups.length - 1; i >= 1; i--) {
        const parentCount = groups[i - 1].count_this_group;
        const earnedTurns = Math.floor(parentCount / cascadeRatio);
        if (groups[i].count_this_group < earnedTurns) {
            return groups[i].group_number;
        }
    }

    // No lower group needs a turn — group 1 gets focus
    return groups[0].group_number;
}

/**
 * Get next item in a group using least-recently-done rotation.
 * Picks the item with the oldest last_date, preferring items not done today.
 */
export function getNextItemId(groups: RotatingGroup[], currentGroupNum: number | undefined): string | undefined {
    if (!currentGroupNum) return undefined;
    const group = groups.find((g) => g.group_number === currentGroupNum);
    if (!group || group.children.length === 0) return undefined;

    // Find the item with the oldest last_date (least recently done)
    const oldest = group.children.reduce((best, item) => {
        const bestDate = parseLastDate(best.last_date);
        const itemDate = parseLastDate(item.last_date);
        if (itemDate !== bestDate) return itemDate < bestDate ? item : best;
        // Same timestamp: prefer lower tally (less done = more overdue)
        return (item.tally ?? 0) < (best.tally ?? 0) ? item : best;
    });
    return oldest.id;
}

/**
 * Resolve the deep next item when groups can have nested sub_groups.
 * Returns the chain: { groupNum, itemId?, subGroupNum?, subItemId? }
 * If the selected group has sub_groups, drill into them to find the active sub-group and item.
 */
export interface DeepNextResult {
    groupNum: number;
    itemId?: string;
    subGroupNum?: number;
    subItemId?: string;
    // Full path for arbitrary depth: array of group_numbers from root to leaf
    groupPath: number[];
    leafItemId?: string;
}

export function getDeepNextItem(groups: RotatingGroup[], cascadeRatio: number = 2): DeepNextResult | undefined {
    const groupNum = getCurrentGroupNum(groups, cascadeRatio);
    if (!groupNum) return undefined;

    const group = groups.find((g) => g.group_number === groupNum);
    if (!group) return undefined;

    // Check if any child in group.children is a nested rotating node; if so, drill into it
    const nestedRotating = group.children.find((c) => c.task_type === 'rotating');
    if (nestedRotating && nestedRotating.groups && nestedRotating.groups.length > 0) {
        const subRatio = nestedRotating.cascade_ratio ?? 2;
        const sub = getDeepNextItem(nestedRotating.groups, subRatio);
        if (sub) {
            return {
                groupNum,
                subGroupNum: sub.groupNum,
                subItemId: sub.itemId ?? sub.leafItemId,
                itemId: undefined,
                groupPath: [groupNum, ...sub.groupPath],
                leafItemId: sub.leafItemId,
            };
        }
        return { groupNum, groupPath: [groupNum] };
    }

    // Leaf group: pick next item
    const itemId = getNextItemId(groups, groupNum);
    return { groupNum, itemId: itemId ?? undefined, groupPath: [groupNum], leafItemId: itemId ?? undefined };
}
