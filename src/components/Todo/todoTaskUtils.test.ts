import {
  addChildAtPath,
  applyMarkDone,
  buildBalanceMap,
  computeDailyBudget,
  computeTotals,
  computeTotalTally,
  createEmptyNode,
  formatDeficit,
  formatHoursHHMM,
  formatLastDate,
  formatTimeRemaining,
  getCurrentSlotId,
  getDeepNextItem,
  getNodeAtPath,
  hasOwnTracking,
  makeId,
  moveChildAtPath,
  moveNode,
  normalizeSlotCycle,
  parseHHMM,
  parseLastDate,
  removeNodeAtPath,
  scheduleToString,
  TodoTaskNode,
  updateNodeAtPath,
} from './todoTaskUtils';

const makeNode = (overrides: Partial<TodoTaskNode> = {}): TodoTaskNode => ({
  id: 'n',
  task_type: 'line_item',
  label: 'L',
  ...overrides,
});

function slot(id: string, count: number, extra: Partial<TodoTaskNode> = {}): TodoTaskNode {
  return {
    id,
    task_type: 'priority_group',
    label: id,
    count_this_group: count,
    children: [],
    ...extra,
  };
}

function slots(...counts: number[]): TodoTaskNode[] {
  return counts.map((count, i) => slot(`s${i + 1}`, count));
}

function rotating(children: TodoTaskNode[], extra: Partial<TodoTaskNode> = {}): TodoTaskNode {
  return { id: 'rot', task_type: 'rotating', label: 'Rotating', children, ...extra };
}

function item(id: string, lastDate?: string, tally = 0): TodoTaskNode {
  return { id, task_type: 'line_item', label: id, last_date: lastDate, tally };
}

describe('getCurrentSlotId', () => {
  it('walks the interleaved 2:1 cascade for a full cycle (3 slots, ratio 2)', () => {
    // Expected rotation: #1 #1 #2 #1 #1 #2 #3, then the cascade reset starts over.
    expect(getCurrentSlotId(slots(0, 0, 0))).toBe('s1');
    expect(getCurrentSlotId(slots(1, 0, 0))).toBe('s1');
    expect(getCurrentSlotId(slots(2, 0, 0))).toBe('s2');
    expect(getCurrentSlotId(slots(2, 1, 0))).toBe('s1');
    expect(getCurrentSlotId(slots(3, 1, 0))).toBe('s1');
    expect(getCurrentSlotId(slots(4, 1, 0))).toBe('s2');
    expect(getCurrentSlotId(slots(4, 2, 0))).toBe('s3');
  });

  it('keeps focus on slot 1 when a lower slot is completed out of order', () => {
    // Regression: earned turns derive from slot 1 (the pacemaker) — a pre-filled middle
    // slot must not fund a turn for the slot below it.
    expect(getCurrentSlotId(slots(2, 2, 0))).toBe('s1');
    expect(getCurrentSlotId(slots(0, 2, 0))).toBe('s1');
    expect(getCurrentSlotId(slots(1, 1, 1))).toBe('s1');
  });

  it('respects a custom cascade ratio', () => {
    expect(getCurrentSlotId(slots(2, 0), 3)).toBe('s1');
    expect(getCurrentSlotId(slots(3, 0), 3)).toBe('s2');
    expect(getCurrentSlotId(slots(3, 1), 3)).toBe('s1');
  });

  it('treats missing counts as 0 and handles trivial slot sets', () => {
    expect(getCurrentSlotId([])).toBeUndefined();
    expect(getCurrentSlotId([slot('only', 5)])).toBe('only');
    const noCounts = [
      { id: 'a', task_type: 'priority_group' as const, label: 'a' },
      { id: 'b', task_type: 'priority_group' as const, label: 'b' },
    ];
    expect(getCurrentSlotId(noCounts)).toBe('a');
  });
});

describe('normalizeSlotCycle', () => {
  it('plays out cycles already complete under the new structure', () => {
    // (4, 2) under 2-slot quotas (2, 1) holds two complete cycles → (0, 0).
    const normalized = normalizeSlotCycle(slots(4, 2));
    expect(normalized.map((s) => s.count_this_group)).toEqual([0, 0]);
  });

  it('keeps a partial cycle remainder after subtracting complete cycles', () => {
    expect(normalizeSlotCycle(slots(3, 1)).map((s) => s.count_this_group)).toEqual([1, 0]);
  });

  it('does not change values that are still a valid mid-cycle position', () => {
    expect(normalizeSlotCycle(slots(1, 0)).map((s) => s.count_this_group)).toEqual([1, 0]);
    expect(normalizeSlotCycle(slots(2, 1, 0)).map((s) => s.count_this_group)).toEqual([2, 1, 0]);
    expect(normalizeSlotCycle(slots(0, 2)).map((s) => s.count_this_group)).toEqual([0, 2]);
  });

  it('respects a custom cascade ratio', () => {
    expect(normalizeSlotCycle(slots(6, 2), 3).map((s) => s.count_this_group)).toEqual([0, 0]);
    expect(normalizeSlotCycle(slots(4, 1), 3).map((s) => s.count_this_group)).toEqual([1, 0]);
  });
});

describe('getDeepNextItem', () => {
  it('picks the least-recently-done item inside the focused priority group', () => {
    const node = rotating([
      slot('s1', 0, {
        children: [
          item('a', '2026-07-10T09:00:00.000Z'),
          item('b', '2026-07-01T09:00:00.000Z'),
          item('c', '2026-07-15T09:00:00.000Z'),
        ],
      }),
      slot('s2', 0),
    ]);
    expect(getDeepNextItem(node)).toEqual({ slotPath: ['s1'], leafItemId: 'b' });
  });

  it('treats a bare task slot as its own completion target', () => {
    const node = rotating([
      { ...item('bare-task'), count_this_group: 2 },
      slot('s2', 0, { children: [item('x')] }),
    ]);
    // counts (2, 0) ratio 2 → slot 2 is due; but make slot 1 due to test the bare case
    const node2 = rotating([
      { ...item('bare-task'), count_this_group: 0 },
      slot('s2', 0, { children: [item('x')] }),
    ]);
    expect(getDeepNextItem(node)?.leafItemId).toBe('x');
    expect(getDeepNextItem(node2)).toEqual({ slotPath: ['bare-task'], leafItemId: 'bare-task' });
  });

  it('recurses into a nested rotating slot', () => {
    const nested = rotating(
      [slot('inner1', 0, { children: [item('deep-item')] }), slot('inner2', 0)],
      { id: 'nested-rot', count_this_group: 0 },
    );
    const node = rotating([nested, slot('s2', 0)]);
    expect(getDeepNextItem(node)).toEqual({
      slotPath: ['nested-rot', 'inner1'],
      leafItemId: 'deep-item',
    });
  });

  it('drills through a priority group whose oldest item is a rotating node', () => {
    // e.g. Watch a Movie: group #2 contains plain items AND a "Watch Group" rotating node
    const watchGroup = rotating(
      [slot('wg1', 0, { children: [item('serial-x')] }), slot('wg2', 0)],
      { id: 'watch-group', count_this_group: 0, last_date: '2026-07-01T00:00:00.000Z' },
    );
    const node = rotating([
      slot('s1', 1, { children: [item('movie-a', '2026-07-10T00:00:00.000Z'), watchGroup] }),
      slot('s2', 0),
    ]);
    // watch-group is the least-recently-done item in s1 — path routes THROUGH it
    expect(getDeepNextItem(node)).toEqual({
      slotPath: ['s1', 'watch-group', 'wg1'],
      leafItemId: 'serial-x',
    });
  });
});

describe('applyMarkDone', () => {
  const NOW = '2026-07-17T10:00:00.000Z';

  it('increments the slot count and stamps the item', () => {
    const node = rotating([
      slot('s1', 1, { children: [item('a', '2026-07-01', 5), item('b')] }),
      slot('s2', 0),
    ]);
    const result = applyMarkDone(node, ['s1'], 'a', NOW);
    const s1 = result.children![0];
    expect(s1.count_this_group).toBe(2);
    expect(s1.children![0].last_date).toBe(NOW);
    expect(s1.children![0].tally).toBe(6);
    // untouched siblings
    expect(s1.children![1].last_date).toBeUndefined();
    expect(result.children![1].count_this_group).toBe(0);
  });

  it('stamps a bare slot itself (no item tally bump)', () => {
    const node = rotating([{ ...item('bare', undefined, 3), count_this_group: 1 }, slot('s2', 0)]);
    const result = applyMarkDone(node, ['bare'], 'bare', NOW);
    const bare = result.children![0];
    expect(bare.count_this_group).toBe(2);
    expect(bare.last_date).toBe(NOW);
    expect(bare.tally).toBe(3); // slot completions are counted by count_this_group, not tally
  });

  it('applies the cascade reset when the LAST slot completes (counts may go negative)', () => {
    // 3 slots ratio 2, quotas (4, 2, 1). Marking the last slot at (4, 2, 0):
    // increment → (4, 2, 1), cascade subtract (4, 2, 1) → (0, 0, 0).
    const node = rotating([slot('s1', 4), slot('s2', 2), slot('s3', 0, { children: [item('z')] })]);
    const result = applyMarkDone(node, ['s3'], 'z', NOW);
    expect(result.children!.map((s) => s.count_this_group)).toEqual([0, 0, 0]);

    // Early completion of the last slot drives counts negative — legitimate.
    const early = rotating([slot('s1', 0), slot('s2', 0, { children: [item('y')] })]);
    const result2 = applyMarkDone(early, ['s2'], 'y', NOW);
    expect(result2.children!.map((s) => s.count_this_group)).toEqual([-2, 0]);
  });

  it('increments every level of a nested slot path and cascades per level', () => {
    const nested = rotating([slot('inner1', 0, { children: [item('deep')] }), slot('inner2', 0)], {
      id: 'nested-rot',
      count_this_group: 0,
    });
    const node = rotating([slot('s1', 2), nested]);
    // nested-rot is the LAST slot of the outer node → outer cascade fires too
    const result = applyMarkDone(node, ['nested-rot', 'inner1'], 'deep', NOW);

    const outer = result.children!;
    // outer: increment nested-rot (0→1), then cascade subtract (2,1) → s1: 2-2=0, nested: 1-1=0
    expect(outer.map((s) => s.count_this_group)).toEqual([0, 0]);
    const inner = outer[1].children!;
    expect(inner[0].count_this_group).toBe(1); // inner slot incremented, no inner cascade (not last)
    expect(inner[0].children![0].last_date).toBe(NOW);
  });

  it('returns the node unchanged for an unknown slot id', () => {
    const node = rotating([slot('s1', 1)]);
    expect(applyMarkDone(node, ['nope'], undefined, NOW)).toEqual(node);
  });

  it('routes through a priority group into a rotating item, stamping every level', () => {
    const watchGroup = rotating(
      [slot('wg1', 0, { children: [item('serial-x')] }), slot('wg2', 0)],
      { id: 'watch-group', count_this_group: 0 },
    );
    const node = rotating([
      slot('s1', 1, { children: [item('movie-a'), watchGroup] }),
      slot('s2', 0),
    ]);
    const result = applyMarkDone(node, ['s1', 'watch-group', 'wg1'], 'serial-x', NOW);

    const s1 = result.children![0];
    expect(s1.count_this_group).toBe(2); // group level incremented
    expect(s1.last_date).toBe(NOW); // group stamped when marked through
    const wg = s1.children![1];
    expect(wg.count_this_group).toBe(0); // an ITEM is not a slot — its count never moves
    expect(wg.last_date).toBe(NOW); // ...but its date does, so intra-group rotation advances
    const wg1 = wg.children![0];
    expect(wg1.count_this_group).toBe(1); // inner slot incremented
    expect(wg1.children![0].last_date).toBe(NOW); // leaf stamped
    // plain sibling untouched
    expect(s1.children![0].last_date).toBeUndefined();
    // outer slot 2 untouched (s1 is not the last slot — no cascade)
    expect(result.children![1].count_this_group).toBe(0);
  });
});

describe('todoTaskUtils path operations', () => {
  test('updateNodeAtPath with empty path patches root', () => {
    const root = makeNode({ id: 'r' });
    const updated = updateNodeAtPath(root, [], { label: 'New' });
    expect(updated.label).toBe('New');
    expect(updated).not.toBe(root);
  });

  test('updateNodeAtPath patches nested child', () => {
    const root = makeNode({
      task_type: 'category',
      children: [makeNode({ id: 'c1', label: 'old' })],
    });
    const updated = updateNodeAtPath(root, [0], { label: 'new' });
    expect(updated.children![0].label).toBe('new');
  });

  test('removeNodeAtPath removes a child', () => {
    const root = makeNode({
      task_type: 'category',
      children: [makeNode({ id: 'a' }), makeNode({ id: 'b' })],
    });
    const updated = removeNodeAtPath(root, [0]);
    expect(updated.children).toHaveLength(1);
    expect(updated.children![0].id).toBe('b');
  });

  test('removeNodeAtPath empty path returns root unchanged', () => {
    const root = makeNode();
    expect(removeNodeAtPath(root, [])).toBe(root);
  });

  test('addChildAtPath appends to root', () => {
    const root = makeNode({ task_type: 'category', children: [] });
    const newChild = makeNode({ id: 'x' });
    const updated = addChildAtPath(root, [], newChild);
    expect(updated.children).toHaveLength(1);
  });

  test('moveChildAtPath up swaps adjacent items', () => {
    const root = makeNode({
      task_type: 'category',
      children: [makeNode({ id: 'a' }), makeNode({ id: 'b' })],
    });
    const updated = moveChildAtPath(root, [1], 'up');
    expect(updated.children![0].id).toBe('b');
    expect(updated.children![1].id).toBe('a');
  });

  test('moveChildAtPath returns root unchanged if out of bounds', () => {
    const root = makeNode({
      task_type: 'category',
      children: [makeNode({ id: 'a' })],
    });
    expect(moveChildAtPath(root, [0], 'up')).toBe(root);
  });

  test('getNodeAtPath walks the tree', () => {
    const inner = makeNode({ id: 'inner' });
    const root = makeNode({
      task_type: 'category',
      children: [makeNode({ task_type: 'category', children: [inner] })],
    });
    expect(getNodeAtPath(root, [0, 0]).id).toBe('inner');
  });

  test('moveNode reorders within same parent', () => {
    const root = makeNode({
      task_type: 'category',
      children: [makeNode({ id: 'a' }), makeNode({ id: 'b' }), makeNode({ id: 'c' })],
    });
    const updated = moveNode(root, [], 0, [], 2);
    expect(updated.children!.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  test('moveNode across parents', () => {
    const root = makeNode({
      task_type: 'category',
      children: [
        makeNode({
          id: 'p1',
          task_type: 'category',
          children: [makeNode({ id: 'x' })],
        }),
        makeNode({
          id: 'p2',
          task_type: 'category',
          children: [],
        }),
      ],
    });
    const updated = moveNode(root, [0], 0, [1], 0);
    expect(updated.children![0].children).toHaveLength(0);
    expect(updated.children![1].children![0].id).toBe('x');
  });
});

describe('todoTaskUtils calculations', () => {
  test('hasOwnTracking detects hours mode', () => {
    expect(hasOwnTracking(makeNode({ tracking_mode: 'hours' }))).toBe(true);
  });

  test('hasOwnTracking detects units-with-budget', () => {
    expect(hasOwnTracking(makeNode({ tally_step: 1, time_budget_hours: 1 }))).toBe(true);
  });

  test('hasOwnTracking returns false for pure container (explicit units, no budget)', () => {
    // tracking_mode now defaults to 'hours' — an unset mode means the node tracks itself.
    expect(hasOwnTracking(makeNode({ task_type: 'category', tracking_mode: 'units' }))).toBe(false);
  });

  test('hasOwnTracking is true by default (hours is the default tracking mode)', () => {
    expect(hasOwnTracking(makeNode({ task_type: 'category' }))).toBe(true);
  });

  test('computeTotalTally sums children', () => {
    const root = makeNode({
      task_type: 'category',
      children: [makeNode({ tally: 3 }), makeNode({ tally: 2 })],
    });
    expect(computeTotalTally(root)).toBe(5);
  });

  test('computeDailyBudget falls back to time_budget_hours on a units leaf', () => {
    expect(computeDailyBudget(makeNode({ tracking_mode: 'units', time_budget_hours: 2 }))).toBe(2);
  });

  test('computeDailyBudget uses tally_step as daily hours in hours mode (the default)', () => {
    expect(computeDailyBudget(makeNode({ tally_step: 1.5, time_budget_hours: 2 }))).toBe(1.5);
  });

  test('buildBalanceMap maps id → balance', () => {
    const m = buildBalanceMap([
      { id: 1, balance: 5 },
      { id: 2, balance: 3 },
    ]);
    expect(m.get(1)).toBe(5);
    expect(m.get(2)).toBe(3);
  });

  test('computeTotals for line_item with units', () => {
    const node = makeNode({ tracking_mode: 'units', tally: 2, time_budget_hours: 1 });
    const t = computeTotals(node);
    expect(t.totalBudgetHours).toBe(2);
  });

  test('computeTotals for hours-mode uses balance map override', () => {
    const node = makeNode({
      tracking_mode: 'hours',
      tally_step: 1,
      todo_balance_id: 9,
      logged_hours: 0,
    });
    const map = buildBalanceMap([{ id: 9, balance: 3 }]);
    const t = computeTotals(node, undefined, map);
    expect(t.totalDeficit).toBe(-3);
  });

  test('computeTotals for category aggregates children', () => {
    const root = makeNode({
      task_type: 'category',
      tracking_mode: 'units',
      children: [
        makeNode({ tracking_mode: 'units', tally: 1, time_budget_hours: 2 }),
        makeNode({ tracking_mode: 'units', tally: 2, time_budget_hours: 1 }),
      ],
    });
    const t = computeTotals(root);
    expect(t.totalBudgetHours).toBe(4);
  });
});

describe('todoTaskUtils formatting', () => {
  test('scheduleToString empty', () => {
    expect(scheduleToString()).toBe('');
    expect(scheduleToString([])).toBe('');
  });
  test('scheduleToString everyday', () => {
    expect(scheduleToString([0, 1, 2, 3, 4, 5, 6])).toBe('everyday');
  });
  test('scheduleToString M-F', () => {
    expect(scheduleToString([1, 2, 3, 4, 5])).toBe('M-F');
  });
  test('scheduleToString Mon-Sat', () => {
    expect(scheduleToString([1, 2, 3, 4, 5, 6])).toBe('Mon-Sat');
  });
  test('scheduleToString generic listing', () => {
    expect(scheduleToString([1, 3])).toBe('Mon, Wed');
  });
  test('scheduleToString shows calendar rule names when present', () => {
    expect(
      scheduleToString(undefined, [
        { calendar_id: 1, calendar_name: 'Work', mode: 'add' },
        { calendar_id: 2, calendar_name: 'Holidays', mode: 'subtract' },
      ]),
    ).toBe('Work, - Holidays');
  });

  test('formatHoursHHMM', () => {
    expect(formatHoursHHMM(0)).toBe('0:00');
    expect(formatHoursHHMM(1.5)).toBe('1:30');
    expect(formatHoursHHMM(-2.25)).toBe('-2:15');
  });

  test('parseHHMM parses HH:MM and decimals', () => {
    expect(parseHHMM('1:30')).toBe(1.5);
    expect(parseHHMM('-2:15')).toBe(-2.25);
    expect(parseHHMM('0.5')).toBe(0.5);
  });

  test('formatLastDate handles empty, ISO, YYYY-MM-DD, and legacy', () => {
    expect(formatLastDate()).toBe('—');
    expect(formatLastDate(null)).toBe('—');
    // Dates outside the current year now include the year suffix
    expect(formatLastDate('2024-01-15')).toBe('1-15-2024');
    expect(formatLastDate('2024-01-15T10:00:00Z')).toMatch(/^\d{1,2}-\d{1,2}-2024$/);
    const thisYear = new Date().getFullYear();
    expect(formatLastDate(`${thisYear}-01-15`)).toBe('1-15');
    expect(formatLastDate('not-iso-legacy')).toBe('not-iso-legacy');
  });

  test('parseLastDate', () => {
    expect(parseLastDate()).toBe(0);
    expect(parseLastDate('')).toBe(0);
    expect(parseLastDate('5-15')).toBe(515);
    expect(typeof parseLastDate('2024-01-15T10:00:00Z')).toBe('number');
  });

  test('formatTimeRemaining negative is over, positive is remaining', () => {
    expect(formatTimeRemaining(2, 1)).toContain('remaining');
    expect(formatTimeRemaining(1, 2)).toContain('over');
  });

  test('formatDeficit', () => {
    expect(formatDeficit(0)).toBe('');
    expect(formatDeficit(1)).toContain('surplus');
    expect(formatDeficit(-1)).toContain('deficit');
  });

  test('makeId includes the prefix', () => {
    const id = makeId('my');
    expect(id.startsWith('my-')).toBe(true);
  });

  test('createEmptyNode shapes by task type', () => {
    const cat = createEmptyNode('category');
    expect(cat.task_type).toBe('category');
    expect(Array.isArray(cat.children)).toBe(true);

    // Slot model: a rotating node starts with two priority_group slot children (no legacy groups)
    const rot = createEmptyNode('rotating');
    expect(rot.task_type).toBe('rotating');
    expect(rot.children).toHaveLength(2);
    expect(rot.children!.every((c) => c.task_type === 'priority_group')).toBe(true);
    expect(rot.children!.every((c) => c.count_this_group === 0)).toBe(true);

    const pg = createEmptyNode('priority_group');
    expect(pg.task_type).toBe('priority_group');
    expect(pg.count_this_group).toBe(0);
    expect(Array.isArray(pg.children)).toBe(true);

    const line = createEmptyNode('line_item');
    expect(line.task_type).toBe('line_item');
    expect(Array.isArray(line.sub_items)).toBe(true);
  });
});
