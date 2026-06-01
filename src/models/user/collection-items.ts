import BaseModel from '../base-model';
import { HasType } from '../has-type';
import Category from '../category';
import { CollectionItemCategory } from './collection-item-category';

export type CollectionItemTypes = 'user';

/**
 * The data interface for albums
 */
export default interface CollectionItem extends BaseModel {

	/**
	 * The primary id of item
	 */
	item_id: number;

	/**
	 * The type of the collection item
	 */
	item_type: CollectionItemTypes;

	/**
	 * The collection id
	 */
	collection_id: number;

	/**
	 * The position within the collection of the item
	 */
	order: number;

	/**
	 * The item object
	 */
	item?: HasType;

	/**
	 * The collection item categories of the item
	 */
	collection_item_categories?: CollectionItemCategory[];

	/**
	 * The categories of the item
	 */
	categories?: Category[];
}

export const placeholderCollectionItem = (): CollectionItem => ({
	item_id: 0,
	item_type: 'user',
	collection_id: 0,
	order: 0,
});
