import api from '../api';
import Collection from "../../models/user/collection";
import CollectionItem from "../../models/user/collection-items";
import { CollectionItemCategory } from '../../models/user/collection-item-category';

export default class CollectionManagementRequests {

    /**
     * Loads a single collection for us
     * @param collectionId
     */
    static async getCollection(collectionId: number) {
        const {data} = await api.get('/collections/' + collectionId);
        return data as Collection;
    }


    /**
     * Runs the creation promise for a collection for us
     * @param userId
     * @param collectionData
     */
    static async createCollection(userId: number, collectionData: Partial<Pick<Collection, 'name' | 'is_public'>>): Promise<Collection> {
        const {data} = await api.post('/users/' + userId + '/collections', collectionData);
        return data as Collection;
    }

    /**
     * Runs our update process
     * @param collection
     * @param collectionData
     */
    static async updateCollection(collection: Collection, collectionData: Partial<Pick<Collection, 'name' | 'is_public'>>): Promise<Collection> {
        const {data} = await api.put('/collections/' + collection.id, collectionData);
        return data as Collection;
    }

    /**
     * Runs a deletion of a post
     * @param collection
     */
    static async deleteCollection(collection: Collection): Promise<boolean> {
        await api.delete('/collections/' + collection.id);
        return true;
    }

    /**
     * Adds an item to a collection
     * @param collection
     * @param collectionItemData
     */
    static async createCollectionItem(collection: Collection, collectionItemData: Partial<CollectionItem>): Promise<CollectionItem> {
        const {data} = await api.post('/collections/' + collection.id + '/items', collectionItemData);
        return data as CollectionItem

    }

    /**
     * Removes an item from a collection
     * @param collectionItem
     */
    static async removeCollectionItem(collectionItem: CollectionItem): Promise<boolean> {
        await api.delete('/collection-items/' + collectionItem.id);
        return true

    }

    /**
     * Links a category to a collection item.
     * @param collectionItemId The ID of the collection item.
     * @param categoryData The data for the link (category_id, linked_at, linked_at_format).
     * @returns Promise with the created CollectionItemCategory link.
     */
    static async createCollectionItemCategory(
        collectionItemId: number,
        categoryData: Pick<CollectionItemCategory, 'category_id' | 'linked_at' | 'linked_at_format'>
    ): Promise<CollectionItemCategory> {
        const { data } = await api.post(`/collection-items/${collectionItemId}/categories`, categoryData);
        return data as CollectionItemCategory;
    }

    /**
     * Updates the link between a collection item and a category.
     * @param collectionItemCategoryId The ID of the CollectionItemCategory link record.
     * @param categoryData The data to update (e.g., linked_at, linked_at_format).
     * @returns Promise with the updated CollectionItemCategory link.
     */
    static async updateCollectionItemCategory(
        collectionItemCategoryId: number,
        categoryData: Partial<Pick<CollectionItemCategory, 'linked_at' | 'linked_at_format'>>
    ): Promise<CollectionItemCategory> {
        const { data } = await api.put(`/collection-item-categories/${collectionItemCategoryId}`, categoryData);
        return data as CollectionItemCategory;
    }

    /**
     * Deletes the link between a collection item and a category.
     * @param collectionItemCategoryId The ID of the CollectionItemCategory link record.
     * @returns Promise resolving to true if successful.
     */
    static async deleteCollectionItemCategory(collectionItemCategoryId: number): Promise<boolean> {
        await api.delete(`/collection-item-categories/${collectionItemCategoryId}`);
        return true;
    }
}
