import Category from '../../models/category';
import BaseModel from '../base-model';

/**
 * Represents the link between a collection item and a category,
 * often used for categorization within a user's collection.
 */
export interface CollectionItemCategory extends BaseModel {
    /**
     * The category id for the collection item category
     */
    category_id: number;

    /**
     * The category for the collection item category
     */
    category: Category;

    /**
     * The collection item this category is linked to
     */
    collection_item_id: number;

    /**
     * The date the category was linked to the collection item. Defaults the created at, can be changed by the user.
     */
    linked_at: string;

    /**
     * The various ways the linked_at date can be formatted
     */
    linked_at_format: 'Y' | 'Y-m' | 'Y-m-d';
} 