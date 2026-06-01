import Category from '../models/category';

/**
 * Finds a category with the passed in name if one exists
 * @param categories
 * @param name
 */
export function findCategory(categories: Category[], name: string): Category|undefined {
    return categories.find(i => i.name.toLowerCase() === name.toLowerCase());
}

/**
 * Removes a category with the passed in name if one exists
 * @param categories
 * @param name
 */
export function removeCategoryFromList(categories: Category[], name: string): Category[] {
    return categories.filter(i => i.name.toLowerCase() !== name.toLowerCase());
}

/**
 * Outputs an empty Category object
 */
export function generateEmptyCategory(): Category {
    return {
        name: "",
        can_be_primary: false
    }
} 