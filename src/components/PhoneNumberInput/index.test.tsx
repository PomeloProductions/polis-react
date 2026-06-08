import { screen, fireEvent, render } from '@testing-library/react';
import PhoneNumberInput from './index';
import { renderWithRouter } from '../../test-utils';
import { PolisProvider } from '../PolisProvider';
import type { PolisTheme } from '../../theme/PolisTheme';

const makeTheme = (primary: string, body: string): PolisTheme => ({
    name: `t-${primary}`,
    colors: {
        primary,
        primaryHover: primary,
        primaryActive: primary,
        surface: '#fff',
        surfaceAlt: '#eee',
        textPrimary: '#111',
        textMuted: '#666',
        border: '#ccc',
        success: '#0a0',
        warning: '#aa0',
        danger: '#a00',
        info: '#00a',
    },
    fonts: { body, heading: body, mono: body },
    radius: { sm: '1px', md: '2px', lg: '3px', full: '99px' },
    spacing: { xs: '1px', sm: '2px', md: '3px', lg: '4px', xl: '5px' },
});

const mockOnPhoneNumberChange = jest.fn();

describe('PhoneNumberInput', () => {
    it('renders without crashing', () => {
        renderWithRouter(
            <PhoneNumberInput
                name="phone"
                value=""
                onPhoneNumberChange={mockOnPhoneNumberChange}
                placeholder="Enter phone number"
            />
        );
        expect(screen.getByPlaceholderText('Enter phone number')).toBeInTheDocument();
    });

    it('formats phone number correctly', () => {
        renderWithRouter(
            <PhoneNumberInput
                name="phone"
                value="1234567890"
                onPhoneNumberChange={mockOnPhoneNumberChange}
                placeholder="Enter phone number"
            />
        );
        const input = screen.getByPlaceholderText('Enter phone number');
        expect(input).toHaveValue('(123) 456-7890');
    });

    it('calls onPhoneNumberChange with undecorated value', () => {
        renderWithRouter(
            <PhoneNumberInput
                name="phone"
                value=""
                onPhoneNumberChange={mockOnPhoneNumberChange}
                placeholder="Enter phone number"
            />
        );
        const input = screen.getByPlaceholderText('Enter phone number');
        fireEvent.change(input, { target: { value: '(123) 456-7890' } });
        expect(mockOnPhoneNumberChange).toHaveBeenCalledWith('1234567890');
    });

    it('renders inside PolisProvider with theme A', () => {
        const theme = makeTheme('#dd0011', 'Body-A');
        render(
            <PolisProvider theme={theme}>
                <PhoneNumberInput
                    name="phone"
                    value=""
                    onPhoneNumberChange={jest.fn()}
                    placeholder="Phone A"
                />
            </PolisProvider>
        );
        expect(screen.getByPlaceholderText('Phone A')).toBeInTheDocument();
        expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#dd0011');
        expect(document.documentElement.style.getPropertyValue('--polis-font-body')).toBe('Body-A');
    });

    it('renders inside PolisProvider with theme B', () => {
        const theme = makeTheme('#1100dd', 'Body-B');
        render(
            <PolisProvider theme={theme}>
                <PhoneNumberInput
                    name="phone"
                    value=""
                    onPhoneNumberChange={jest.fn()}
                    placeholder="Phone B"
                />
            </PolisProvider>
        );
        expect(screen.getByPlaceholderText('Phone B')).toBeInTheDocument();
        expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#1100dd');
        expect(document.documentElement.style.getPropertyValue('--polis-font-body')).toBe('Body-B');
    });
});
