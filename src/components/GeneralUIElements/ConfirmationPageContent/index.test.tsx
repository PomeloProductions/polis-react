import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmationPageContent from './index';

describe('ConfirmationPageContent', () => {
    const mockOnConfirm = jest.fn();

    beforeEach(() => {
        mockOnConfirm.mockClear();
    });

    it('renders children content', () => {
        render(
            <ConfirmationPageContent onConfirm={mockOnConfirm} confirmText="Confirm">
                <div data-testid="test-content">Test Content</div>
            </ConfirmationPageContent>
        );

        expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('renders confirm button with correct text', () => {
        render(
            <ConfirmationPageContent onConfirm={mockOnConfirm} confirmText="Confirm Action">
                Test Content
            </ConfirmationPageContent>
        );

        const button = screen.getByText('Confirm Action');
        expect(button).toBeInTheDocument();
    });

    it('calls onConfirm when button is clicked', () => {
        render(
            <ConfirmationPageContent onConfirm={mockOnConfirm} confirmText="Confirm">
                Test Content
            </ConfirmationPageContent>
        );

        const button = screen.getByText('Confirm');
        fireEvent.click(button);

        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
});
