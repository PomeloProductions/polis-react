import { findCategory, removeCategoryFromList, generateEmptyCategory } from './category-utils';
import Category from '../models/category';
import { mockCategory } from '../test-utils/mocks/models/category';

describe('Category Utilities', () => {
    const mockCategories: Category[] = [
        mockCategory({ name: 'Action', can_be_primary: true }),
        mockCategory({ name: 'RPG', can_be_primary: true }),
        mockCategory({ name: 'Strategy', can_be_primary: false })
    ];

    describe('findCategory', () => {
        it('should find a category by name (case insensitive)', () => {
            const found = findCategory(mockCategories, 'action');
            expect(found).toEqual(mockCategories[0]);
        });

        it('should return undefined if category not found', () => {
            const found = findCategory(mockCategories, 'nonexistent');
            expect(found).toBeUndefined();
        });
    });

    describe('removeCategoryFromList', () => {
        it('should remove a category by name (case insensitive)', () => {
            const result = removeCategoryFromList(mockCategories, 'rpg');
            expect(result).toHaveLength(2);
            expect(result).not.toContainEqual(mockCategories[1]);
        });

        it('should return original list if category not found', () => {
            const result = removeCategoryFromList(mockCategories, 'nonexistent');
            expect(result).toEqual(mockCategories);
        });
    });

    describe('generateEmptyCategory', () => {
        it('should return an empty category object', () => {
            const empty = generateEmptyCategory();
            expect(empty).toEqual({
                name: "",
                can_be_primary: false
            });
        });
    });
}); 