import BaseModel from './base-model';

/**
 * The interface for what we can expect our category to look like
 */
export default interface Category extends BaseModel {

    /**
     * The name of the category
     */
    name: string;

    /**
     * The description of the category if it is written
     */
    description?: string;

    /**
     * The ID of the parent category if this is a subcategory
     */
    parent_id?: number;

    /**
     * The parent category if loaded
     */
    parent?: Category;

    /**
     * The child categories if loaded
     */
    children?: Category[];

    /**
     * Whether or not this category can be used as a primary category for a business
     */
    can_be_primary?: boolean;
}

/**
 * Creates a placeholder category with default values
 */
export const placeholderCategory = (): Category => ({
    name: ''
});
