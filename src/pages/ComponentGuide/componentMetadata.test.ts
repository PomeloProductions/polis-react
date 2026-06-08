import { COMPONENT_GUIDE, CATEGORIES, getComponentGuide } from './componentMetadata';

describe('componentMetadata', () => {
  test('COMPONENT_GUIDE is a non-empty array', () => {
    expect(Array.isArray(COMPONENT_GUIDE)).toBe(true);
    expect(COMPONENT_GUIDE.length).toBeGreaterThan(0);
  });

  test('every entry has required fields', () => {
    for (const entry of COMPONENT_GUIDE) {
      expect(typeof entry.type).toBe('string');
      expect(typeof entry.displayName).toBe('string');
      expect(typeof entry.description).toBe('string');
      expect(typeof entry.longDescription).toBe('string');
      expect(typeof entry.requiresAuth).toBe('boolean');
      expect(Array.isArray(entry.configOptions)).toBe(true);
      expect(Array.isArray(entry.exampleConfigs)).toBe(true);
      expect(['dashboard', 'content', 'settings']).toContain(entry.category);
    }
  });

  test('getComponentGuide returns the entry for a known type', () => {
    const known = COMPONENT_GUIDE[0];
    expect(getComponentGuide(known.type)).toEqual(known);
  });

  test('getComponentGuide returns undefined for an unknown type', () => {
    expect(getComponentGuide('not-a-real-type')).toBeUndefined();
  });

  test('CATEGORIES contains the categories used by entries', () => {
    for (const entry of COMPONENT_GUIDE) {
      expect(CATEGORIES[entry.category]).toBeDefined();
      expect(typeof CATEGORIES[entry.category].label).toBe('string');
      expect(typeof CATEGORIES[entry.category].color).toBe('string');
    }
  });
});
