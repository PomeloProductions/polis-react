import {
  assignmentsForSpace,
  createMemorySpaceAssignmentStore,
  type SpaceAssignmentMap,
} from './space-model';

describe('assignmentsForSpace', () => {
  const map: SpaceAssignmentMap = {
    dashboard: [
      { pluginSlug: 'a', component: 'a-widget', order: 20 },
      { pluginSlug: 'b', component: 'b-widget', order: 10 },
      { pluginSlug: 'c', component: 'c-widget', enabled: false },
      { pluginSlug: 'd', component: 'd-widget' }, // order defaults 0
    ],
  };

  it('returns [] for an unknown space', () => {
    expect(assignmentsForSpace(map, 'nope')).toEqual([]);
  });

  it('filters disabled and sorts ascending by order (default 0)', () => {
    expect(assignmentsForSpace(map, 'dashboard').map((a) => a.pluginSlug)).toEqual(['d', 'b', 'a']);
  });

  it('keeps input order for ties', () => {
    const tie: SpaceAssignmentMap = {
      s: [
        { pluginSlug: 'x', component: 'x', order: 5 },
        { pluginSlug: 'y', component: 'y', order: 5 },
      ],
    };
    expect(assignmentsForSpace(tie, 's').map((a) => a.pluginSlug)).toEqual(['x', 'y']);
  });
});

describe('createMemorySpaceAssignmentStore', () => {
  it('loads seeded data (cloned, not shared by reference)', async () => {
    const seed = { 1: { s: [{ pluginSlug: 'a', component: 'c' }] } };
    const store = createMemorySpaceAssignmentStore(seed);
    const loaded = await store.load(1);
    expect(loaded).toEqual({ s: [{ pluginSlug: 'a', component: 'c' }] });
    // mutate the loaded copy — seed + store stay intact
    loaded.s.push({ pluginSlug: 'z', component: 'z' });
    expect((await store.load(1)).s).toHaveLength(1);
  });

  it('round-trips save/load and isolates users', async () => {
    const store = createMemorySpaceAssignmentStore();
    expect(await store.load(42)).toEqual({});
    await store.save(42, { s: [{ pluginSlug: 'a', component: 'c', config: { k: 1 } }] });
    expect(await store.load(42)).toEqual({
      s: [{ pluginSlug: 'a', component: 'c', config: { k: 1 } }],
    });
    expect(await store.load(99)).toEqual({});
  });
});
