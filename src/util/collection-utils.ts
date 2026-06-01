import { CollectionItemsContextState } from '../contexts/CollectionItemsContext';
import type CollectionItem from '../models/user/collection-items';
import { HasType } from '../models/has-type';

/**
 * Checks if an item exists in a collection by comparing both item_id and item_type
 * @param item The item to check
 * @param collectionId The ID of the collection
 * @param collectionItemsContext The collection items context
 * @returns boolean indicating if the item is in the collection
 */
export const isInCollection = (
    item: HasType,
    collectionId: number,
    collectionItemsContext: CollectionItemsContextState
): boolean => {
    if (!collectionId || !collectionItemsContext[collectionId]) return false;
    
    return collectionItemsContext[collectionId].loadedData.some(
        (ci: CollectionItem) => ci.item_id === item.id && ci.item_type === item.type
    );
}; 