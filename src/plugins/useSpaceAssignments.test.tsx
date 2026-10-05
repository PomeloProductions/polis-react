import { renderHook, act, waitFor } from '@testing-library/react';
import { useSpaceAssignments } from './useSpaceAssignments';
import { createMemorySpaceAssignmentStore } from './space-model';

describe('useSpaceAssignments', () => {
  it('loads the map for a user', async () => {
    const store = createMemorySpaceAssignmentStore({
      1: { dashboard: [{ pluginSlug: 'a', component: 'a-widget' }] },
    });
    const { result } = renderHook(() => useSpaceAssignments(1, store));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.forSpace('dashboard').map((a) => a.pluginSlug)).toEqual(['a']);
  });

  it('is empty + not loading when userId is undefined', async () => {
    const store = createMemorySpaceAssignmentStore();
    const { result } = renderHook(() => useSpaceAssignments(undefined, store));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.map).toEqual({});
  });

  it('addToSpace persists to the store', async () => {
    const store = createMemorySpaceAssignmentStore();
    const { result } = renderHook(() => useSpaceAssignments(7, store));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.addToSpace('dashboard', {
        pluginSlug: 'feedback',
        component: 'feedback-widget',
      });
    });
    expect(result.current.forSpace('dashboard')).toHaveLength(1);
    expect((await store.load(7)).dashboard).toHaveLength(1);
  });

  it('removeFromSpace removes the matching deliverable', async () => {
    const store = createMemorySpaceAssignmentStore({
      3: {
        dashboard: [
          { pluginSlug: 'a', component: 'a-widget' },
          { pluginSlug: 'b', component: 'b-widget' },
        ],
      },
    });
    const { result } = renderHook(() => useSpaceAssignments(3, store));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.removeFromSpace('dashboard', 'a', 'a-widget');
    });
    expect(result.current.forSpace('dashboard').map((a) => a.pluginSlug)).toEqual(['b']);
    expect((await store.load(3)).dashboard).toHaveLength(1);
  });

  it('setSpace replaces a space wholesale', async () => {
    const store = createMemorySpaceAssignmentStore();
    const { result } = renderHook(() => useSpaceAssignments(1, store));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.setSpace('s', [{ pluginSlug: 'x', component: 'x' }]);
    });
    expect(result.current.forSpace('s')).toHaveLength(1);
  });

  it('surfaces a load error', async () => {
    const store = {
      load: jest.fn(async () => {
        throw new Error('boom');
      }),
      save: jest.fn(async () => {}),
    };
    const { result } = renderHook(() => useSpaceAssignments(1, store));
    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(result.current.loading).toBe(false);
  });
});
