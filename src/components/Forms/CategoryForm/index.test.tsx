import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategoryForm from './index';
import { mockCategory } from '../../../test-utils/mocks/models/category';

describe('CategoryForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form elements correctly in create mode', () => {
    render(
      <CategoryForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel}
        isSubmitting={false}
        submitError={null}
        mode="create"
      />
    );
    
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Can be primary category/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create/i })).toBeInTheDocument();
  });
  
  test('renders form elements correctly in edit mode with category data', () => {
    render(
      <CategoryForm 
        category={mockCategory({ description: 'Test Description' })}
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel}
        isSubmitting={false}
        submitError={null}
        mode="edit"
      />
    );
    
    expect(screen.getByLabelText(/Name/i)).toHaveValue('Test Category');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Test Description');
    expect(screen.getByLabelText(/Can be primary category/i)).toBeChecked();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });
  
  test('shows error message when provided', () => {
    render(
      <CategoryForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel}
        isSubmitting={false}
        submitError="Error message"
        mode="create"
      />
    );
    
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
  
  test('disables form elements when submitting', () => {
    render(
      <CategoryForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel}
        isSubmitting={true}
        submitError={null}
        mode="create"
      />
    );
    
    expect(screen.getByLabelText(/Name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Description/i)).toBeDisabled();
    expect(screen.getByLabelText(/Can be primary category/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled();
  });
  
  test('handles input changes', () => {
    render(
      <CategoryForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel}
        isSubmitting={false}
        submitError={null}
        mode="create"
      />
    );
    
    const nameInput = screen.getByLabelText(/Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);
    const checkboxInput = screen.getByLabelText(/Can be primary category/i);
    
    fireEvent.change(nameInput, { target: { value: 'New Category' } });
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } });
    fireEvent.click(checkboxInput);
    
    expect(nameInput).toHaveValue('New Category');
    expect(descriptionInput).toHaveValue('New Description');
    expect(checkboxInput).toBeChecked();
  });
  
  test('calls onSubmit with form data when submitted', async () => {
    render(
      <CategoryForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel}
        isSubmitting={false}
        submitError={null}
        mode="create"
      />
    );
    
    const nameInput = screen.getByLabelText(/Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);
    const checkboxInput = screen.getByLabelText(/Can be primary category/i);
    
    fireEvent.change(nameInput, { target: { value: 'New Category' } });
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } });
    fireEvent.click(checkboxInput);
    
    fireEvent.submit(screen.getByRole('form'));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New Category',
        description: 'New Description',
        can_be_primary: true
      });
    });
  });
  
  test('calls onCancel when cancel button is clicked', () => {
    render(
      <CategoryForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel}
        isSubmitting={false}
        submitError={null}
        mode="create"
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    
    expect(mockOnCancel).toHaveBeenCalled();
  });
}); 