import React, { PropsWithChildren } from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import MyCollections from './index';
import User from '../../../models/user/user';
import { UserCollectionsContext, UserCollectionsContextState } from '../../../contexts/UserCollectionsContext';
import CollectionManagementRequests from '../../../services/requests/CollectionManagementRequests';
import { mockPagination } from '../../../test-utils/mocks/pagination';
import { renderWithProviders } from '../../../test-utils';
import Collection from '../../../models/user/collection';
import CollectionItem from '../../../models/user/collection-items';
import { mockUser } from '../../../test-utils/mocks/models';

// Mock the CollectionManagementRequests
jest.mock('../../../services/requests/CollectionManagementRequests', () => ({
  createCollection: jest.fn()
}));

// Mock the UserCollectionsContext
jest.mock('../../../contexts/UserCollectionsContext', () => {
  const originalModule = jest.requireActual('../../../contexts/UserCollectionsContext');
  return {
    ...originalModule,
    UserCollectionsContextProvider: ({ children }: PropsWithChildren<{}>) => <>{children}</>,
    UserCollectionsContext: {
      Consumer: ({ children }: PropsWithChildren<{ children: (value: UserCollectionsContextState) => React.ReactNode }>) => (
        <div data-testid="mock-consumer">
          {children(mockPagination<Collection>())}
        </div>
      )
    }
  };
});

// Mock the CollectionItemsContext
jest.mock('../../../contexts/CollectionItemsContext', () => {
  const originalModule = jest.requireActual('../../../contexts/CollectionItemsContext');
  return {
    ...originalModule,
    CollectionItemsContextProvider: ({ children }: PropsWithChildren<{}>) => <>{children}</>,
    CollectionItemsContext: {
      Consumer: ({ children }: PropsWithChildren<{ children: (value: any) => React.ReactNode }>) => (
        <div data-testid="mock-collection-items-consumer">
          {children(mockPagination<CollectionItem>())}
        </div>
      )
    }
  };
});

describe('MyCollections', () => {
  const testUser = mockUser();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders collections when user has id', () => {
    renderWithProviders(
      <MyCollections user={testUser} />
    );

    expect(screen.getByText('My Collections')).toBeInTheDocument();
  });

  it('renders nothing when user has no id', () => {
    const userWithoutId: User = {
      ...testUser,
      id: 0 // Use 0 instead of undefined since id is required
    };
    const { container } = renderWithProviders(
      <MyCollections user={userWithoutId} />
    );

    // The component should not render any content, only the Mantine style element
    expect(container.children.length).toBe(1);
    expect(container.firstChild).toHaveAttribute('data-mantine-styles', 'classes');
  });

  test('renders My Collections header and create button', () => {
    renderWithProviders(
      <MyCollections user={testUser} />
    );
    
    expect(screen.getByText('My Collections')).toBeInTheDocument();
    expect(screen.getByText('Create Collection')).toBeInTheDocument();
  });

  test('opens modal when create button is clicked', () => {
    renderWithProviders(
      <MyCollections user={testUser} />
    );
    
    const createButton = screen.getByText('Create Collection');
    fireEvent.click(createButton);
    
    expect(screen.getByText('Create New Collection')).toBeInTheDocument();
  });

  test('closes modal when cancel button is clicked', async () => {
    renderWithProviders(
      <MyCollections user={testUser} />
    );
    
    // Open modal
    const createButton = screen.getByText('Create Collection');
    fireEvent.click(createButton);
    
    // Verify modal is open
    expect(screen.getByText('Create New Collection')).toBeInTheDocument();
    
    // Close modal
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // Verify modal is closed
    await waitFor(() => {
      expect(screen.queryByText('Create New Collection')).not.toBeInTheDocument();
    });
  });

  test('creates collection when form is submitted', async () => {
    // Mock the createCollection function
    const mockNewCollection = {
      id: 123,
      name: 'New Collection',
      is_public: false,
      owner_id: 1,
      owner_type: 'user',
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
      collection_items_count: 0
    };
    
    (CollectionManagementRequests.createCollection as jest.Mock).mockResolvedValue(mockNewCollection);
    
    // Mock the addModel function
    const mockAddModel = jest.fn();
    jest.spyOn(UserCollectionsContext, 'Consumer').mockImplementation(
      ({ children }) => (
        <div data-testid="mock-consumer-spy">
          {children(mockPagination<Collection>({
            addModel: mockAddModel
          }))}
        </div>
      )
    );
    
    renderWithProviders(
      <MyCollections user={testUser} />
    );
    
    // Open modal
    const createButton = screen.getByText('Create Collection');
    fireEvent.click(createButton);
    
    // Fill form
    const nameInput = screen.getByLabelText('Collection Name');
    fireEvent.change(nameInput, { target: { value: 'New Collection' } });
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    
    // Verify createCollection was called
    await waitFor(() => {
      expect(CollectionManagementRequests.createCollection).toHaveBeenCalledWith(1, {
        name: 'New Collection',
        is_public: true
      });
    });
    
    // Verify addModel was called with the new collection
    expect(mockAddModel).toHaveBeenCalledWith(mockNewCollection);
    
    // Verify modal is closed
    await waitFor(() => {
      expect(screen.queryByText('Create New Collection')).not.toBeInTheDocument();
    });
  });

  test('displays error when collection creation fails', async () => {
    // Mock the createCollection function to throw an error
    (CollectionManagementRequests.createCollection as jest.Mock).mockRejectedValue(new Error('Failed to create collection'));
    
    renderWithProviders(
      <MyCollections user={testUser} />
    );
    
    // Open modal
    const createButton = screen.getByText('Create Collection');
    fireEvent.click(createButton);
    
    // Fill form
    const nameInput = screen.getByLabelText('Collection Name');
    fireEvent.change(nameInput, { target: { value: 'New Collection' } });
    
    // Submit form
    const submitButton = screen.getByTestId('submit-button');
    fireEvent.click(submitButton);
    
    // Verify error message is displayed
    await waitFor(() => {
      const errorMessage = screen.getByText('Failed to create collection');
      expect(errorMessage).toBeInTheDocument();
    });
    await waitFor(() => {
      const errorMessage = screen.getByText('Failed to create collection');
      expect(errorMessage.closest('.error-message')).toBeInTheDocument();
    });
    
    // Verify modal is still open
    expect(screen.getByText('Create New Collection')).toBeInTheDocument();
  });
}); 