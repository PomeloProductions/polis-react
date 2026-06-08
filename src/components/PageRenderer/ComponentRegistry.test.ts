import { getComponent, getRegisteredTypes } from './ComponentRegistry';

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
