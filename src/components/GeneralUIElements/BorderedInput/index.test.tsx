import { render, screen, fireEvent } from '@testing-library/react';
import BorderedInput from '.';

describe('BorderedInput', () => {
    const mockOnChange = jest.fn();
    
    beforeEach(() => {
        mockOnChange.mockClear();
    });

    it('renders children content', () => {
        render(
            <BorderedInput>
                <div data-testid="test-content">Test Content</div>
            </BorderedInput>
        );

        expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('applies correct styling class', () => {
        render(
            <BorderedInput>
                Test Content
            </BorderedInput>
        );

        expect(screen.getByText('Test Content').closest('div')).toHaveClass('bordered-input');
    });

    test('renders with content', () => {
        render(<BorderedInput value="Test Content" onChange={mockOnChange} />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveValue('Test Content');
        expect(input.closest('div')).toHaveClass('bordered-input');
    });

    test('should handle input changes', () => {
        render(<BorderedInput value="" onChange={mockOnChange} />);
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'test' } });
        expect(mockOnChange).toHaveBeenCalledWith('test');
    });
});
