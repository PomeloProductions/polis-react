import { findCategory, removeCategoryFromList, generateEmptyCategory } from '../util/category-utils';
import { mockCategory } from '../test-utils/mocks/models/category';

describe('Category Model', () => {
  const mockCategories = [
    mockCategory({ id: 1, name: 'Action', description: 'Action games', can_be_primary: true }),
    mockCategory({ id: 2, name: 'RPG', description: 'Role-playing games', can_be_primary: true }),
    mockCategory({ id: 3, name: 'Strategy', description: 'Strategy games', can_be_primary: false })
  ];

  describe('findCategory', () => {
    it('finds a category by name (case insensitive)', () => {
      const foundCategory = findCategory(mockCategories, 'action');
      expect(foundCategory).toEqual(mockCategories[0]);
    });

    it('returns undefined if category is not found', () => {
      const foundCategory = findCategory(mockCategories, 'non-existent');
      expect(foundCategory).toBeUndefined();
    });
  });

  describe('removeCategoryFromList', () => {
    it('removes a category by name (case insensitive)', () => {
      const updatedCategories = removeCategoryFromList(mockCategories, 'action');
      expect(updatedCategories).toHaveLength(2);
      expect(updatedCategories).not.toContainEqual(mockCategories[0]);
    });

    it('returns the original list if category is not found', () => {
      const updatedCategories = removeCategoryFromList(mockCategories, 'non-existent');
      expect(updatedCategories).toEqual(mockCategories);
    });
  });

  describe('generateEmptyCategory', () => {
    it('generates an empty category with default values', () => {
      const emptyCategory = generateEmptyCategory();
      expect(emptyCategory).toEqual({
        name: '',
        can_be_primary: false
      });
    });
  });
});
