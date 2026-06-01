import { screen, fireEvent } from '@testing-library/react';
import Page from './index';
import { renderWithRouter } from '../../../test-utils';

describe('Page', () => {
    it('renders children content', () => {
        renderWithRouter(
            <Page>
                <div data-testid="test-content">Test Content</div>
            </Page>
        );

        expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('renders sidebar and navigation', () => {
        renderWithRouter(<Page />);

        // Check for sidebar
        const homeLink = document.querySelector('a[href="/"]');
        expect(homeLink).toBeInTheDocument();
        
        // Check for navigation
        expect(screen.getByText('Header Title')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '☰' })).toBeInTheDocument();
    });

    it('toggles sidebar when button is clicked', () => {
        renderWithRouter(<Page />);

        const toggleButton = screen.getByRole('button', { name: '☰' });
        const sidebar = screen.getByTestId('sidebar');

        // Initial state
        expect(sidebar).toHaveClass('open');

        // Click button
        fireEvent.click(toggleButton);

        // Check if sidebar is collapsed
        expect(sidebar).toHaveClass('collapsed');
        expect(sidebar).not.toHaveClass('open');

        // Click button again
        fireEvent.click(toggleButton);

        // Check if sidebar is open again
        expect(sidebar).toHaveClass('open');
        expect(sidebar).not.toHaveClass('collapsed');
    });
});
