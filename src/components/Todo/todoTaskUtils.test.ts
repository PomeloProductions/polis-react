import {
    updateNodeAtPath,
    removeNodeAtPath,
    addChildAtPath,
    moveChildAtPath,
    hasOwnTracking,
    computeTotalTally,
    computeDailyBudget,
    buildBalanceMap,
    computeTotals,
    scheduleToString,
    formatHoursHHMM,
    formatLastDate,
    parseLastDate,
    parseHHMM,
    formatTimeRemaining,
    formatDeficit,
    makeId,
    createEmptyNode,
    getNodeAtPath,
    moveNode,
    distributeIntoGroups,
    TodoTaskNode,
    RotatingGroup,
} from './todoTaskUtils';

const makeNode = (overrides: Partial<TodoTaskNode> = {}): TodoTaskNode => ({
    id: 'n',
    task_type: 'line_item',
    label: 'L',
    ...overrides,
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
        expect(
            hasOwnTracking(makeNode({ tally_step: 1, time_budget_hours: 1 }))
        ).toBe(true);
    });

    test('hasOwnTracking returns false for pure container', () => {
        expect(hasOwnTracking(makeNode({ task_type: 'category' }))).toBe(false);
    });

    test('computeTotalTally sums children', () => {
        const root = makeNode({
            task_type: 'category',
            children: [makeNode({ tally: 3 }), makeNode({ tally: 2 })],
        });
        expect(computeTotalTally(root)).toBe(5);
    });

    test('computeDailyBudget falls back to time_budget_hours on leaf', () => {
        expect(computeDailyBudget(makeNode({ time_budget_hours: 2 }))).toBe(2);
    });

    test('buildBalanceMap maps id → balance', () => {
        const m = buildBalanceMap([{ id: 1, balance: 5 }, { id: 2, balance: 3 }]);
        expect(m.get(1)).toBe(5);
        expect(m.get(2)).toBe(3);
    });

    test('computeTotals for line_item with units', () => {
        const node = makeNode({ tally: 2, time_budget_hours: 1 });
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
            children: [
                makeNode({ tally: 1, time_budget_hours: 2 }),
                makeNode({ tally: 2, time_budget_hours: 1 }),
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
        expect(formatLastDate('2024-01-15')).toBe('1-15');
        expect(formatLastDate('2024-01-15T10:00:00Z')).toMatch(/^\d{1,2}-\d{1,2}$/);
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

        const rot = createEmptyNode('rotating');
        expect(rot.task_type).toBe('rotating');
        expect(Array.isArray(rot.groups)).toBe(true);
        expect(rot.groups).toHaveLength(2);

        const line = createEmptyNode('line_item');
        expect(line.task_type).toBe('line_item');
        expect(Array.isArray(line.sub_items)).toBe(true);
    });

    test('distributeIntoGroups distributes evenly', () => {
        const items: TodoTaskNode[] = [
            makeNode({ id: 'a' }),
            makeNode({ id: 'b' }),
            makeNode({ id: 'c' }),
        ];
        const existing: RotatingGroup[] = [];
        const groups = distributeIntoGroups(items, 2, existing, 'Priority');
        expect(groups).toHaveLength(2);
        expect(groups[0].children.length + groups[1].children.length).toBe(3);
    });
});
