import Category from '../../../models/category';

export const mockCategory = (overrides: Partial<Category> = {}): Category => ({
    id: 1,
    name: 'Test Category',
    description: 'A test category',
    can_be_primary: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
}); 