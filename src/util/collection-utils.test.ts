import { isInCollection } from './collection-utils';
import { CollectionItemsContextState } from '../contexts/CollectionItemsContext';
import type CollectionItem from '../models/user/collection-items';
import { mockPagination } from '../test-utils/mocks/pagination';
import type { HasType } from '../models/has-type';

describe('collection-utils', () => {
    describe('isInCollection', () => {
        const mockItem: HasType = {
            id: 1,
            type: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        const mockCollectionId = 123;
        
        const createMockContextState = (items: Array<{ item_id: number; item_type: string }>) => mockPagination<CollectionItem>({
            loadedData: items.map((item, index) => ({
                ...item,
                collection_id: mockCollectionId,
                order: index + 1
            })) as CollectionItem[]
        });

        it('should return false when collectionId is not provided', () => {
            const context: CollectionItemsContextState = {};
            expect(isInCollection(mockItem, 0, context)).toBe(false);
        });

        it('should return false when collection does not exist in context', () => {
            const context: CollectionItemsContextState = {};
            expect(isInCollection(mockItem, mockCollectionId, context)).toBe(false);
        });

        it('should return false when item is not in collection', () => {
            const context: CollectionItemsContextState = {
                [mockCollectionId]: createMockContextState([
                    { item_id: 2, item_type: 'user' },
                    { item_id: 3, item_type: 'user' }
                ])
            };
            expect(isInCollection(mockItem, mockCollectionId, context)).toBe(false);
        });

        it('should return true when item exists in collection with matching id and type', () => {
            const context: CollectionItemsContextState = {
                [mockCollectionId]: createMockContextState([
                    { item_id: 2, item_type: 'user' },
                    { item_id: 1, item_type: 'user' }
                ])
            };
            expect(isInCollection(mockItem, mockCollectionId, context)).toBe(true);
        });
    });
}); 