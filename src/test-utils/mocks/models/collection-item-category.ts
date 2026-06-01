import { CollectionItemCategory } from '../../../models/user/collection-item-category';
import { mockCategory } from './category';

export const mockCollectionItemCategory = (overrides: Partial<CollectionItemCategory> = {}): CollectionItemCategory => ({
    id: 50,
    category_id: 1,
    collection_item_id: 100,
    linked_at: '2024-03-20T00:00:00Z',
    linked_at_format: 'Y-m-d',
    category: mockCategory({ id: 1, name: 'Action' }),
    created_at: '2024-03-20T00:00:00Z',
    updated_at: '2024-03-20T00:00:00Z',
    ...overrides
}); 