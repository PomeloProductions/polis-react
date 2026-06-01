import { render, screen } from '@testing-library/react';
import UnderlinedInput from './index';

describe('UnderlinedInput', () => {
    it('renders children content', () => {
        render(
            <UnderlinedInput>
                <div data-testid="test-content">Test Content</div>
            </UnderlinedInput>
        );

        expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('applies correct styling class', () => {
        const { container } = render(
            <UnderlinedInput>
                Test Content
            </UnderlinedInput>
        );

        expect(container.firstChild).toHaveClass('underlined-input');
    });
});
