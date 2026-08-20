const dedupedGet = jest.fn();
const postMock = jest.fn();
const putMock = jest.fn();
const patchMock = jest.fn();
const deleteMock = jest.fn();
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => postMock(...args),
    put: (...args: unknown[]) => putMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
  dedupedGet: (...args: unknown[]) => dedupedGet(...args),
}));

import * as Todo from './TodoRequests';

beforeEach(() => {
  [dedupedGet, postMock, putMock, patchMock, deleteMock].forEach((m) => m.mockReset());
});

describe('TodoRequests', () => {
  test('getTodoToday GETs /users/:id/todos/today', () => {
    Todo.getTodoToday(7);
    expect(dedupedGet).toHaveBeenCalledWith('/users/7/todos/today');
  });

  test('getTodoResolve GETs with slug param', () => {
    Todo.getTodoResolve(7, 'foo');
    expect(dedupedGet).toHaveBeenCalledWith('/users/7/todos/resolve', {
      params: { slug: 'foo' },
    });
  });

  test('getTodoNavigate GETs with level and date', () => {
    Todo.getTodoNavigate(7, 'month', '2024-01-01');
    expect(dedupedGet).toHaveBeenCalledWith('/users/7/todos/navigate', {
      params: { level: 'month', date: '2024-01-01' },
    });
  });

  test('getTodoHierarchy GETs with year', () => {
    Todo.getTodoHierarchy(7, 2024);
    expect(dedupedGet).toHaveBeenCalledWith('/users/7/todos/hierarchy', {
      params: { year: 2024 },
    });
  });

  test('postTodoGenerate POSTs with through_date', () => {
    Todo.postTodoGenerate(7, '2024-12-31');
    expect(postMock).toHaveBeenCalledWith('/users/7/todos/generate', {
      through_date: '2024-12-31',
    });
  });

  test('getTodoSettings GETs /users/:id/todos/settings', () => {
    Todo.getTodoSettings(7);
    expect(dedupedGet).toHaveBeenCalledWith('/users/7/todos/settings');
  });

  test('updateTodoSettings PUTs the settings', () => {
    Todo.updateTodoSettings(7, { day_start_at: '08:00' } as never);
    expect(putMock).toHaveBeenCalledWith('/users/7/todos/settings', {
      day_start_at: '08:00',
    });
  });

  test('getBalances GETs /users/:id/todos/balances', () => {
    Todo.getBalances(7);
    expect(dedupedGet).toHaveBeenCalledWith('/users/7/todos/balances');
  });

  test('getRunningTimer GETs /users/:id/todos/timer', () => {
    Todo.getRunningTimer(7);
    expect(dedupedGet).toHaveBeenCalledWith('/users/7/todos/timer');
  });

  test('startRunningTimer POSTs the timer payload', () => {
    Todo.startRunningTimer(7, {
      label: 'x',
      started_at: '2024-01-01T00:00:00Z',
    });
    expect(postMock).toHaveBeenCalledWith('/users/7/todos/timer', {
      label: 'x',
      started_at: '2024-01-01T00:00:00Z',
    });
  });

  test('stopRunningTimer DELETEs the timer endpoint with the stop target as params', () => {
    // Targeted stop: identifies the entry so a stop racing the next task's start
    // can never close the freshly-created entry.
    Todo.stopRunningTimer(7, { entry_id: 42, item_id: 'node-1' });
    expect(deleteMock).toHaveBeenCalledWith('/users/7/todos/timer', {
      params: { entry_id: 42, item_id: 'node-1' },
    });
  });

  test('stopRunningTimer without a target falls back to legacy stop-whatever-is-running', () => {
    Todo.stopRunningTimer(7);
    expect(deleteMock).toHaveBeenCalledWith('/users/7/todos/timer', { params: undefined });
  });

  test('todo template CRUD endpoints', () => {
    Todo.getTodoTemplates(7);
    expect(dedupedGet).toHaveBeenCalledWith('/users/7/todos/templates');
    Todo.createTodoTemplate(7, { name: 't' } as never);
    expect(postMock).toHaveBeenCalledWith('/users/7/todos/templates', { name: 't' });
    Todo.updateTodoTemplate(7, 3, { name: 't2' } as never);
    expect(putMock).toHaveBeenCalledWith('/users/7/todos/templates/3', { name: 't2' });
    Todo.deleteTodoTemplate(7, 3);
    expect(deleteMock).toHaveBeenCalledWith('/users/7/todos/templates/3');
  });

  test('patchTodoNode PATCHes with component id merged in', () => {
    Todo.patchTodoNode(7, 'client-abc', 99, { status: 'done' });
    expect(patchMock).toHaveBeenCalledWith('/users/7/todos/nodes/client-abc', {
      status: 'done',
      component_id: 99,
    });
  });

  test('time entry CRUD endpoints', () => {
    Todo.getTimeEntries(7, '2024-01-01', '2024-01-31');
    expect(dedupedGet).toHaveBeenCalledWith('/users/7/todos/time-entries', {
      params: { from: '2024-01-01', to: '2024-01-31' },
    });
    Todo.createTimeEntry(7, {
      label: 'x',
      started_at: 'a',
      duration_seconds: 5,
    });
    expect(postMock).toHaveBeenCalledWith('/users/7/todos/time-entries', {
      label: 'x',
      started_at: 'a',
      duration_seconds: 5,
    });
    Todo.updateTimeEntry(7, 9, { label: 'y' });
    expect(putMock).toHaveBeenCalledWith('/users/7/todos/time-entries/9', {
      label: 'y',
    });
    Todo.deleteTimeEntry(7, 9);
    expect(deleteMock).toHaveBeenCalledWith('/users/7/todos/time-entries/9');
  });
});
