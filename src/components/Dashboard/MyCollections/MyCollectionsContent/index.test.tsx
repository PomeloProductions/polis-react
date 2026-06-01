import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import MyCollectionsContent from './index';
import Collection from '../../../../models/user/collection';
import { mockCollection } from '../../../../test-utils/mocks/models/collection';
import { mockPagination } from '../../../../test-utils/mocks/pagination';

// Mock the CollectionCard component
jest.mock('./CollectionCard', () => ({
    __esModule: true,
    default: ({ collection, itemCount }: { collection: Collection, itemCount: number }) => (
        <div data-testid={`collection-card-${collection.id}`}>
            {collection.name} ({itemCount} items)
        </div>
    ),
}));

describe('MyCollectionsContent', () => {
    const mockContextState = mockPagination<Collection>({
        loadedData: [
            mockCollection({ id: 1, name: 'Collection 1' }),
            mockCollection({ id: 2, name: 'Collection 2' })
        ]
    });

    const mockOnEditCollection = jest.fn();

    it('renders collections when data is available', () => {
        render(
            <MantineProvider>
                <MyCollectionsContent
                    collectionsContext={mockContextState}
                    onEditCollection={mockOnEditCollection}
                />
            </MantineProvider>
        );

        // Verify both collection cards are rendered
        const collection1Card = screen.getByTestId('collection-card-1');
        const collection2Card = screen.getByTestId('collection-card-2');

        expect(collection1Card).toBeInTheDocument();
        expect(collection2Card).toBeInTheDocument();

        // Check that the grid is rendered - using className instead of role
        const grid = screen.getByTestId('collections-grid');
        expect(grid).toHaveClass('collections-grid');
    });

    it('displays loading state when refreshing', () => {
        render(
            <MantineProvider>
                <MyCollectionsContent
                    collectionsContext={{ ...mockContextState, refreshing: true }}
                    onEditCollection={mockOnEditCollection}
                />
            </MantineProvider>
        );

        const loadingElement = screen.getByText('Loading collections...');
        expect(loadingElement).toBeInTheDocument();
    });

    it('displays empty state when no collections', () => {
        render(
            <MantineProvider>
                <MyCollectionsContent
                    collectionsContext={{ ...mockContextState, loadedData: [] }}
                    onEditCollection={mockOnEditCollection}
                />
            </MantineProvider>
        );

        const emptyStateElement = screen.getByText('You don\'t have any collections yet.');
        expect(emptyStateElement).toBeInTheDocument();
    });

    it('renders collection cards correctly', () => {
        render(
            <MantineProvider>
                <MyCollectionsContent
                    collectionsContext={mockContextState}
                    onEditCollection={mockOnEditCollection}
                />
            </MantineProvider>
        );
        
        // Check that collection cards are rendered with the right data
        const collection1Card = screen.getByTestId('collection-card-1');
        const collection2Card = screen.getByTestId('collection-card-2');
        
        expect(collection1Card).toHaveTextContent('Collection 1');
        expect(collection2Card).toHaveTextContent('Collection 2');
    });
}); 