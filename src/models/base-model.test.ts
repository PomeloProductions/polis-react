import { filterUnique } from './base-model';

describe('filterUnique', () => {
    test('removes duplicate models by id keeping first occurrence', () => {
        const input = [
            { id: 1, name: 'A' },
            { id: 2, name: 'B' },
            { id: 1, name: 'A-dup' },
            { id: 3, name: 'C' },
        ];
        expect(filterUnique(input)).toEqual([
            { id: 1, name: 'A' },
            { id: 2, name: 'B' },
            { id: 3, name: 'C' },
        ]);
    });

    test('returns an empty array when input is empty', () => {
        expect(filterUnique([])).toEqual([]);
    });

    test('treats undefined ids as a group', () => {
        const input = [{ name: 'A' }, { name: 'B' }, { id: 1, name: 'C' }];
        // Two with undefined id → first wins
        expect(filterUnique(input)).toEqual([{ name: 'A' }, { id: 1, name: 'C' }]);
    });
});
