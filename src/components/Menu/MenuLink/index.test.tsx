import { screen } from '@testing-library/react';
import MenuLink from './index';
import { renderWithRouter } from '../../../test-utils';

describe('MenuLink', () => {
    it('renders with correct styling and content', () => {
        renderWithRouter(<MenuLink to="/test">Test Link</MenuLink>, { route: '/test' });
        
        const link = screen.getByText('Test Link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveClass('list-group-item', 'list-group-item-action', 'list-group-item-light', 'p-3');
        expect(link).toHaveAttribute('href', '/test');
    });

    it('handles additional props correctly', () => {
        renderWithRouter(<MenuLink to="/test" data-testid="test-link">Test Link</MenuLink>, { route: '/test' });
        
        const link = screen.getByTestId('test-link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/test');
    });
});
