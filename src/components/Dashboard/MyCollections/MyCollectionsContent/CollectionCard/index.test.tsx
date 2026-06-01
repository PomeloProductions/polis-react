import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import CollectionCard from './index';
import { mockCollection } from '../../../../../test-utils/mocks/models/collection';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
    Link: ({ to, className, children }: any) => (
        <a href={to} className={className} data-testid="collection-link">
            {children}
        </a>
    )
}));

// Test wrapper with MantineProvider
const renderWithMantine = (ui: React.ReactElement) => {
    return render(
        <MantineProvider>
            {ui}
        </MantineProvider>
    );
};

describe('CollectionCard', () => {
    const mockOnEditClick = jest.fn();
    
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    it('renders correctly with provided props', () => {
        renderWithMantine(
            <CollectionCard 
                collection={mockCollection()} 
                itemCount={10} 
                onEditClick={mockOnEditClick} 
            />
        );
        
        // Test card container exists
        const cardContainer = screen.getByTestId('collection-link');
        expect(cardContainer).toBeInTheDocument();
        
        // Test collection name is displayed
        const collectionName = screen.getByText('Test Collection');
        expect(collectionName).toBeInTheDocument();
        
        // Test item count is displayed
        const itemCount = screen.getByText('10');
        expect(itemCount).toBeInTheDocument();
        
        // Test edit button is displayed
        const editButton = screen.getByLabelText('Edit Test Collection');
        expect(editButton).toBeInTheDocument();
    });
    
    it('does not show edit button when onEditClick is not provided', () => {
        renderWithMantine(
            <CollectionCard 
                collection={mockCollection()} 
                itemCount={10} 
            />
        );
        
        // Edit button should not exist
        const editButton = screen.queryByLabelText('Edit Test Collection');
        expect(editButton).not.toBeInTheDocument();
    });
    
    it('calls onEditClick when edit button is clicked', () => {
        renderWithMantine(
            <CollectionCard 
                collection={mockCollection()} 
                itemCount={10} 
                onEditClick={mockOnEditClick} 
            />
        );
        
        // Find and click the edit button
        const editButton = screen.getByLabelText('Edit Test Collection');
        fireEvent.click(editButton);
        
        // Check if the mock function was called
        expect(mockOnEditClick).toHaveBeenCalledTimes(1);
        expect(mockOnEditClick).toHaveBeenCalledWith(expect.any(Object), mockCollection());
    });
}); 