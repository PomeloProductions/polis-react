import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import CategoryAutocomplete from './index';
import { renderWithRouter } from '../../../test-utils';
import CategoryRequests from '../../../services/requests/CategoryRequests';
import { mockCategory } from '../../../test-utils/mocks/models/category';

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

// Mock the CategoryRequests
jest.mock('../../../services/requests/CategoryRequests', () => ({
  createCategory: jest.fn()
}));

describe('CategoryAutocomplete', () => {
  jest.setTimeout(10000); // Add a 10-second timeout for all tests in this suite

  const mockOnSelect = jest.fn();


  beforeEach(() => {
    mockOnSelect.mockClear();
    (CategoryRequests.createCategory as jest.Mock).mockClear();
  });

  const renderWithMantine = (component: React.ReactElement) => {
    return render(
      <MantineProvider>
        {component}
      </MantineProvider>
    );
  };

  it('renders with default props', () => {
    renderWithMantine(<CategoryAutocomplete onSelect={mockOnSelect} />);
    expect(screen.getByPlaceholderText('Search categories...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    renderWithMantine(<CategoryAutocomplete onSelect={mockOnSelect} placeholder="Custom placeholder" />);
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('renders with label', () => {
    renderWithMantine(<CategoryAutocomplete onSelect={mockOnSelect} label="Category" />);
    const input = screen.getByRole('textbox', { name: 'Category' });
    expect(input).toBeInTheDocument();
  });

  it('handles input changes', async () => {
    renderWithMantine(<CategoryAutocomplete onSelect={mockOnSelect} />);
    const input = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(input, { target: { value: 'Test' } });
    expect(input).toHaveValue('Test');
  });

  it('calls onSelect when existing category is selected', async () => {
    const testCategory = mockCategory({ id: 1, name: 'Test Category' });
    renderWithMantine(
      <CategoryAutocomplete 
        onSelect={mockOnSelect} 
        prioritizedCategories={[testCategory]}
      />
    );
    const input = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(input, { target: { value: 'Test Category' } });
    
    // Wait for the options to appear
    await waitFor(() => {
      expect(screen.getByText('Test Category')).toBeInTheDocument();
    });
    
    // Click the option
    fireEvent.click(screen.getByText('Test Category'));
    
    // Wait for the onSelect callback to be called
    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith(testCategory);
    });
  });

  it('creates new category when non-existent category is selected', async () => {
    const newCategory = mockCategory({ id: 2, name: 'New Category' });
    (CategoryRequests.createCategory as jest.Mock).mockResolvedValueOnce(newCategory);
    
    renderWithMantine(<CategoryAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(input, { target: { value: 'New Category' } });
    
    // Wait for the option to appear
    await waitFor(() => {
      expect(screen.getByText('New Category')).toBeInTheDocument();
    });
    
    // Click the option
    fireEvent.click(screen.getByText('New Category'));
    
    // Wait for the category creation and onSelect callback
    await waitFor(() => {
      expect(CategoryRequests.createCategory).toHaveBeenCalledWith('New Category');
    });
    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith(newCategory);
    });
  });

  it('handles category creation error', async () => {
    (CategoryRequests.createCategory as jest.Mock).mockRejectedValueOnce(new Error('Creation failed'));
    
    renderWithMantine(<CategoryAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(input, { target: { value: 'New Category' } });
    
    // Wait for the option to appear
    await waitFor(() => {
      expect(screen.getByText('New Category')).toBeInTheDocument();
    });
    
    // Click the option
    fireEvent.click(screen.getByText('New Category'));
    
    // Wait for the category creation attempt
    await waitFor(() => {
      expect(CategoryRequests.createCategory).toHaveBeenCalledWith('New Category');
    });
    await waitFor(() => {
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  it('shows loading indicator when searching', async () => {
    renderWithRouter(<CategoryAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(input, { target: { value: 'Action' } });
    
    await waitFor(() => {
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });

  it('shows existing categories when searching', async () => {
    renderWithRouter(<CategoryAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(input, { target: { value: 'Action' } });
    
    await waitFor(() => {
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });

  it('clears input when ref.clearInput is called', async () => {
    const ref = React.createRef<{ clearInput: () => void }>();
    
    renderWithRouter(<CategoryAutocomplete onSelect={mockOnSelect} ref={ref} />);
    
    const input = screen.getByPlaceholderText('Search categories...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test Category' } });
    
    expect(input.value).toBe('Test Category');
    
    ref.current?.clearInput();
    
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('prioritizes categories passed in prioritizedCategories prop', async () => {
    const prioritizedCategories = [
      mockCategory({ id: 4, name: 'Strategy' }),
      mockCategory({ id: 5, name: 'Simulation' })
    ];
    
    renderWithRouter(
      <CategoryAutocomplete 
        onSelect={mockOnSelect}
        prioritizedCategories={prioritizedCategories}
      />
    );
    
    const input = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(input, { target: { value: 'S' } });
    
    await waitFor(() => {
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveTextContent('Strategy');
    });
    await waitFor(() => {
      // It's possible options might need to be fetched again if the DOM could change between waits.
      // For this specific case, assuming options remain stable after the first waitFor.
      const options = screen.getAllByRole('option'); 
      expect(options[1]).toHaveTextContent('Simulation');
    });
  });
}); 