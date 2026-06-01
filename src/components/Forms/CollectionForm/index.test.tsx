import { render, screen, fireEvent } from '@testing-library/react';
import CollectionForm from './index';

describe('CollectionForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form elements correctly', () => {
    render(
      <CollectionForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    expect(screen.getByLabelText('Collection Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Make this collection public')).toBeInTheDocument();
    expect(screen.getByText('Create Collection')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('displays error message when provided', () => {
    const errorMessage = 'This is an error message';
    render(
      <CollectionForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel}
        error={errorMessage}
      />
    );
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('calls onSubmit with form data when submitted', () => {
    render(
      <CollectionForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    // Fill in the form
    const nameInput = screen.getByLabelText('Collection Name');
    fireEvent.change(nameInput, { target: { value: 'Test Collection' } });
    
    const publicCheckbox = screen.getByLabelText('Make this collection public');
    fireEvent.click(publicCheckbox); // Toggle to false
    
    // Submit the form
    const submitButton = screen.getByText('Create Collection');
    fireEvent.click(submitButton);
    
    // Check that onSubmit was called with the correct data
    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'Test Collection',
      isPublic: false
    });
  });

  test('calls onCancel when cancel button is clicked', () => {
    render(
      <CollectionForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('disables form elements when isSubmitting is true', () => {
    render(
      <CollectionForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel}
        isSubmitting={true}
      />
    );
    
    expect(screen.getByLabelText('Collection Name')).toBeDisabled();
    expect(screen.getByLabelText('Make this collection public')).toBeDisabled();
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  test('validates required fields', () => {
    render(
      <CollectionForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel} 
      />
    );
    
    // Submit the form without filling in the name
    const submitButton = screen.getByText('Create Collection');
    fireEvent.click(submitButton);
    
    // Check that onSubmit was not called
    expect(mockOnSubmit).not.toHaveBeenCalled();
    
    // Check that the name input is marked as required
    const nameInput = screen.getByLabelText('Collection Name');
    expect(nameInput).toHaveAttribute('required');
  });
}); 