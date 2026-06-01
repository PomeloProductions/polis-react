import { screen } from '@testing-library/react';
import CollectionsModal from './index';
import { mockCollection } from '../../../test-utils/mocks/models/collection';
import { renderWithProviders } from '../../../test-utils';
import { HasType } from '../../../models/has-type';

describe('CollectionsModal', () => {
    const mockItem: HasType = {
        id: 123,
        type: 'release',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
    };

    const mockCollections = [
        mockCollection({ 
            id: 1, 
            name: 'Collection 1', 
            collection_items_count: 5 
        }),
        mockCollection({ 
            id: 2, 
            name: 'Collection 2', 
            collection_items_count: 10 
        })
    ];

    it('renders collections when data is available', () => {
        renderWithProviders(
            <CollectionsModal
                isOpen={true}
                onRequestClose={jest.fn()}
                items={mockItem}
                collections={mockCollections}
            />
        );

        expect(screen.getByText('Collections for Release')).toBeInTheDocument();
        expect(screen.getByText('Collection 1')).toBeInTheDocument();
        expect(screen.getByText('Collection 2')).toBeInTheDocument();
    });

    it('renders empty state when no collections are available', () => {
        renderWithProviders(
            <CollectionsModal
                isOpen={true}
                onRequestClose={jest.fn()}
                items={mockItem}
                collections={[]}
            />
        );

        expect(screen.getByText('Collections for Release')).toBeInTheDocument();
        expect(screen.queryByText('Collection 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Collection 2')).not.toBeInTheDocument();
    });
});