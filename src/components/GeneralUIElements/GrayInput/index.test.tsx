import { render, screen } from '@testing-library/react';
import GrayInput from './index';

describe('GrayInput', () => {
    it('renders children content', () => {
        render(
            <GrayInput>
                <div data-testid="test-content">Test Content</div>
            </GrayInput>
        );

        expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('applies correct styling class', () => {
        render(
            <GrayInput>
                Test Content
            </GrayInput>
        );

        expect(screen.getByText('Test Content').closest('div')).toHaveClass('gray-input');
    });
});
