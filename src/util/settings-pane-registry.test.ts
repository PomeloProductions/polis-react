import { createSettingsPaneRegistry } from './settings-pane-registry';

describe('settings-pane-registry', () => {
  it('registers and resolves a pane by value', () => {
    const reg = createSettingsPaneRegistry();
    reg.register({ value: 'theme', label: 'Theme', panel: 'theme-panel' });
    expect(reg.get('theme')).toMatchObject({ value: 'theme', label: 'Theme' });
    expect(reg.get('missing')).toBeUndefined();
  });

  it('registerMany + getRegisteredValues', () => {
    const reg = createSettingsPaneRegistry();
    reg.registerMany([
      { value: 'theme', label: 'Theme', panel: 'a' },
      { value: 'reports', label: 'Reports', panel: 'b' },
    ]);
    expect(reg.getRegisteredValues().sort()).toEqual(['reports', 'theme']);
  });

  it('re-registering the same value replaces rather than duplicates', () => {
    const reg = createSettingsPaneRegistry();
    reg.register({ value: 'theme', label: 'Old', panel: 'a' });
    reg.register({ value: 'theme', label: 'New', panel: 'b' });
    expect(reg.getRegisteredValues()).toEqual(['theme']);
    expect(reg.get('theme')?.label).toBe('New');
  });

  it('getAll sorts by order then label', () => {
    const reg = createSettingsPaneRegistry();
    reg.register({ value: 'c', label: 'Charlie', panel: 'c', order: 2 });
    reg.register({ value: 'a', label: 'Alpha', panel: 'a' }); // order default 0
    reg.register({ value: 'b', label: 'Bravo', panel: 'b' }); // order default 0
    expect(reg.getAll().map((p) => p.value)).toEqual(['a', 'b', 'c']);
  });

  it('unregister removes a pane', () => {
    const reg = createSettingsPaneRegistry();
    reg.register({ value: 'theme', label: 'Theme', panel: 'a' });
    reg.unregister('theme');
    expect(reg.get('theme')).toBeUndefined();
    expect(reg.getRegisteredValues()).toEqual([]);
  });

  it('reset clears everything', () => {
    const reg = createSettingsPaneRegistry();
    reg.registerMany([
      { value: 'a', label: 'A', panel: 'a' },
      { value: 'b', label: 'B', panel: 'b' },
    ]);
    reg.reset();
    expect(reg.getRegisteredValues()).toEqual([]);
  });
});
