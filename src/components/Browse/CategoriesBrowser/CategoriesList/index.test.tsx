import { screen, fireEvent, waitFor } from '@testing-library/react';
import CategoriesList from './index';
import { mockCategoriesContextValue } from '../../../../test-utils/mocks/contexts';
import { renderWithProviders } from '../../../../test-utils';
import CategoryRequests from '../../../../services/requests/CategoryRequests';
import { mockCategory } from '../../../../test-utils/mocks/models/category';

// Mock the useNavigate hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock CategoryRequests
jest.mock('../../../../services/requests/CategoryRequests');

// Mock window.confirm
const mockConfirm = jest.spyOn(window, 'confirm');
mockConfirm.mockImplementation(() => true);

describe('CategoriesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders categories when data is loaded', () => {
    renderWithProviders(
      <CategoriesList
        contextState={{
          ...mockCategoriesContextValue,
          loadedData: [mockCategory()],
        }}
      />,
    );

    expect(screen.getByRole('row', { name: /name description/i })).toBeInTheDocument();
    expect(screen.getByText('Test Category')).toBeInTheDocument();
  });

  it('handles delete action correctly', async () => {
    const mockRemoveModel = jest.fn();
    const contextValue = {
      ...mockCategoriesContextValue,
      removeModel: mockRemoveModel,
    };

    (CategoryRequests.deleteCategory as jest.Mock).mockResolvedValue({});

    renderWithProviders(<CategoriesList contextState={contextValue} />);

    // Find and click the delete button for the first category
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    // Check if confirm was called
    expect(mockConfirm).toHaveBeenCalled();

    // Check if the delete request was made
    expect(CategoryRequests.deleteCategory).toHaveBeenCalledWith(1);

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(mockRemoveModel).toHaveBeenCalledWith(mockCategoriesContextValue.loadedData[0]);
    });
  });

  it('handles edit action correctly', () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);

    renderWithProviders(<CategoriesList contextState={mockCategoriesContextValue} />);

    // Find and click the edit button for the first category
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    // Verify navigation
    expect(mockNavigate).toHaveBeenCalledWith('/browse/categories/1/edit');
  });
});
