import {
  getComponent,
  getRegisteredTypes,
  getComponentLabel,
  registerComponentLabels,
} from './ComponentRegistry';

describe('ComponentRegistry', () => {
  test('returns null for unknown type', () => {
    expect(getComponent('not-a-real-type')).toBeNull();
  });

  test('returns a lazy component for a registered type', () => {
    const Component = getComponent('stats_cards');
    expect(Component).not.toBeNull();
  });

  test('getRegisteredTypes returns the registry keys', () => {
    const types = getRegisteredTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
    expect(types).toEqual(expect.arrayContaining(['stats_cards', 'settings_panel']));
  });
});

describe('ComponentRegistry labels', () => {
  test('getComponentLabel returns the seeded label for a built-in type', () => {
    expect(getComponentLabel('stats_cards')).toBe('Stats Cards');
    expect(getComponentLabel('settings_panel')).toBe('Settings Panel');
  });

  test('getComponentLabel falls back to a de-underscored type when unregistered', () => {
    expect(getComponentLabel('todo_bullet_list')).toBe('todo bullet list');
  });

  test('registerComponentLabels lets a consumer own its label (e.g. Goals)', () => {
    registerComponentLabels({ todo_bullet_list: 'Goals' });
    expect(getComponentLabel('todo_bullet_list')).toBe('Goals');
  });

  test('registered labels override built-ins with the same type', () => {
    registerComponentLabels({ stats_cards: 'Metrics' });
    expect(getComponentLabel('stats_cards')).toBe('Metrics');
  });
});
