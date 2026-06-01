import Collection from '../../../models/user/collection';
import { mockCollectionItem } from './collection-items';

export const mockCollection = (overrides: Partial<Collection> = {}): Collection => ({
    id: 1,
    type: 'collection',
    owner_id: 1,
    owner_type: 'user',
    name: 'Test Collection',
    is_public: true,
    collection_items_count: 1,
    collectionItems: [mockCollectionItem()],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
}); 