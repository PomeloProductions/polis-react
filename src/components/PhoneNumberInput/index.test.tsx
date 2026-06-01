import { screen, fireEvent } from '@testing-library/react';
import PhoneNumberInput from './index';
import { renderWithRouter } from '../../test-utils';

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
});
