import { HasType } from '../has-type';
import CollectionItem from "./collection-items";

export const collectionDefaultData = {
	is_public: false,
	owner_type: 'user',
}

export const collectionPlaceholder: Collection = {
	type: 'collection',
	owner_id: 0,
	owner_type: '',
	is_public: false,
};

/**
 * The data interface for albums
 */
export default interface Collection extends HasType {

	/**
	 * The primary id of album creator
	 */
	owner_id: number;

	/**
	 * The type of thing that owns this album
	 */
	owner_type: string;

	/**
	 * The album name
	 */
	name?: string;

	/**
	 * Public visibility boolean
	 */
	is_public: boolean;

	/**
	 * Number of items in the collection
	 */
	collection_items_count?: number;

	/**
	 * Items within the collection
	 */
	collectionItems?: CollectionItem[];
}

export const placeholderCollection = (): Collection => ({
	type: 'collection',
	owner_id: 0,
	owner_type: 'user',
	name: '',
	is_public: false,
});
