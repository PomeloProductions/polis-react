import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import CollectionItemComponent from './index';
import CollectionManagementRequests from '../../../../services/requests/CollectionManagementRequests';
import CollectionItem from '../../../../models/user/collection-items';
import { mockCollection } from '../../../../test-utils/mocks/models/collection';
import { mockCollectionItem } from '../../../../test-utils/mocks/models/collection-items';
import { mockCollectionItemCategory } from '../../../../test-utils/mocks/models/collection-item-category';
import { mockCategory } from '../../../../test-utils/mocks/models/category';
import { mockPagination } from '../../../../test-utils/mocks/pagination';

// Mock dependencies
jest.mock('../../../../services/requests/CollectionManagementRequests', () => ({
    createCollectionItem: jest.fn(),
    removeCollectionItem: jest.fn(),
    createCollectionItemCategory: jest.fn(),
    deleteCollectionItemCategory: jest.fn()
}));

// Mock CategoryAutocomplete component
jest.mock('../../../GeneralUIElements/CategoryAutocomplete', () => {
    return {
        __esModule: true,
        default: React.forwardRef((props: any, ref: React.Ref<any>) => (
            <div data-testid="category-autocomplete">
                <input 
                    placeholder={props.placeholder} 
                    data-testid="category-input"
                    ref={ref as React.RefObject<HTMLInputElement>}
                />
                <button 
                    data-testid="mock-select-category"
                    onClick={() => props.onSelect(mockCategory({ id: 1, name: 'Test Category' }))}
                >
                    Select Category
                </button>
            </div>
        ))
    };
});

// Helper function to render component with MantineProvider
const renderWithProviders = (ui: React.ReactElement) => {
    return render(
        <MantineProvider>
            {ui}
        </MantineProvider>
    );
};

describe('CollectionItemComponent', () => {
    const mockItem = {
        id: 1,
        type: 'user' as const,
        created_at: '2024-03-20T00:00:00Z',
        updated_at: '2024-03-20T00:00:00Z'
    };

    const testCollectionItem = mockCollectionItem({
        id: 100,
        item_id: mockItem.id,
        item_type: mockItem.type,
        collection_item_categories: [mockCollectionItemCategory({
            id: 50,
            category: mockCategory({ id: 2, name: 'Action' })
        })]
    });

    const testCollection = mockCollection({
        id: 1,
        name: 'Test Collection',
        collection_items_count: 5,
        collectionItems: [testCollectionItem]
    });

    const mockCollectionContextState = mockPagination<CollectionItem>({
        loadedData: []
    });

    const mockCollectionItemsContext = {
        1: mockCollectionContextState
    };

    // Reset mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
        mockCollectionContextState.loadedData = [];
    });

    it('renders in not-in-collection state', () => {
        renderWithProviders(
            <CollectionItemComponent
                collection={testCollection}
                item={mockItem}
                collectionItemsContext={mockCollectionItemsContext}
            />
        );

        expect(screen.getByText('Test Collection')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('Add to Collection')).toBeInTheDocument();
        expect(screen.queryByText('Categories:')).not.toBeInTheDocument();
    });

    it('renders in in-collection state with categories', () => {
        mockCollectionContextState.loadedData = [testCollectionItem];

        renderWithProviders(
            <CollectionItemComponent
                collection={testCollection}
                item={mockItem}
                collectionItemsContext={mockCollectionItemsContext}
            />
        );

        expect(screen.getByText('Test Collection')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('Remove from Collection')).toBeInTheDocument();
        expect(screen.getByText('Categories:')).toBeInTheDocument();
        expect(screen.getByText('Action')).toBeInTheDocument();
        expect(screen.getByTestId('category-autocomplete')).toBeInTheDocument();
    });

    it('handles adding to collection', async () => {
        (CollectionManagementRequests.createCollectionItem as jest.Mock).mockResolvedValue(testCollectionItem);

        renderWithProviders(
            <CollectionItemComponent
                collection={testCollection}
                item={mockItem}
                collectionItemsContext={mockCollectionItemsContext}
            />
        );

        const addButton = screen.getByText('Add to Collection');
        fireEvent.click(addButton);

        await waitFor(() => {
            expect(CollectionManagementRequests.createCollectionItem).toHaveBeenCalledWith(
                testCollection,
                {
                    item_id: mockItem.id,
                    item_type: mockItem.type,
                    order: 0
                }
            );
        });
        expect(mockCollectionItemsContext[1].addModel).toHaveBeenCalledWith(testCollectionItem);
    });

    it('handles removing from collection', async () => {
        (CollectionManagementRequests.removeCollectionItem as jest.Mock).mockResolvedValue({});
        mockCollectionContextState.loadedData = [testCollectionItem];

        renderWithProviders(
            <CollectionItemComponent
                collection={testCollection}
                item={mockItem}
                collectionItemsContext={mockCollectionItemsContext}
            />
        );

        const removeButton = screen.getByText('Remove from Collection');
        fireEvent.click(removeButton);

        await waitFor(() => {
            expect(CollectionManagementRequests.removeCollectionItem).toHaveBeenCalledWith(testCollectionItem);
        });
        expect(mockCollectionItemsContext[1].removeModel).toHaveBeenCalledWith(testCollectionItem);
    });

    it('handles adding a category', async () => {
        const newCategory = mockCollectionItemCategory({
            id: 51,
            category: mockCategory({ id: 1, name: 'Test Category' })
        });
        (CollectionManagementRequests.createCollectionItemCategory as jest.Mock).mockResolvedValue(newCategory);
        mockCollectionContextState.loadedData = [testCollectionItem];

        renderWithProviders(
            <CollectionItemComponent
                collection={testCollection}
                item={mockItem}
                collectionItemsContext={mockCollectionItemsContext}
            />
        );

        const selectButton = screen.getByTestId('mock-select-category');
        fireEvent.click(selectButton);

        await waitFor(() => {
            expect(CollectionManagementRequests.createCollectionItemCategory).toHaveBeenCalledWith(
                100,
                {
                    category_id: 1,
                    linked_at: expect.any(String),
                    linked_at_format: 'Y-m-d'
                }
            );
        });
    });

    it('handles removing a category', async () => {
        (CollectionManagementRequests.deleteCollectionItemCategory as jest.Mock).mockResolvedValue({});
        mockCollectionContextState.loadedData = [testCollectionItem];

        renderWithProviders(
            <CollectionItemComponent
                collection={testCollection}
                item={mockItem}
                collectionItemsContext={mockCollectionItemsContext}
            />
        );

        const categoryButtons = screen.getAllByRole('button');
        const removeCategoryButton = categoryButtons.find(
            btn => btn.querySelector('svg') && btn.querySelector('svg')?.className.baseVal.includes('tabler-icon-trash')
        );
        fireEvent.click(removeCategoryButton!);

        await waitFor(() => {
            expect(CollectionManagementRequests.deleteCollectionItemCategory).toHaveBeenCalledWith(50);
        });
    });
}); 