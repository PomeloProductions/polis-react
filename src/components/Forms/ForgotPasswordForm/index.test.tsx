import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ForgotPasswordForm from './index';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

const forgotPasswordMock = jest.fn();
jest.mock('../../../services/requests/ResetPasswordRequests', () => ({
    __esModule: true,
    default: {
        forgotPassword: (...args: unknown[]) => forgotPasswordMock(...args),
    },
}));

const renderForm = (props: Record<string, unknown> = {}) =>
    render(
        <BrowserRouter>
            <ForgotPasswordForm {...props} />
        </BrowserRouter>
    );

beforeEach(() => {
    mockNavigate.mockReset();
    forgotPasswordMock.mockReset();
});

describe('ForgotPasswordForm', () => {
    test('renders email field and submit button', () => {
        renderForm();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Send reset link/i })).toBeInTheDocument();
    });

    test('validates required email', async () => {
        const { container } = renderForm();
        await act(async () => {
            fireEvent.submit(container.querySelector('form')!);
        });
        await waitFor(() => {
            expect(screen.getByText('Email is required')).toBeInTheDocument();
        });
        expect(forgotPasswordMock).not.toHaveBeenCalled();
    });

    test('validates email format', async () => {
        const { container } = renderForm();
        const input = container.querySelector('input')!;
        fireEvent.input(input, { target: { value: 'notanemail' } });
        await act(async () => {
            fireEvent.submit(container.querySelector('form')!);
        });
        await waitFor(() => {
            expect(screen.getByText('Must be a valid email')).toBeInTheDocument();
        });
    });

    test('shows inline confirmation on success without redirect', async () => {
        forgotPasswordMock.mockResolvedValueOnce({});
        const { container } = renderForm();
        const input = container.querySelector('input')!;
        fireEvent.input(input, { target: { value: 'a@b.com' } });
        await act(async () => {
            fireEvent.submit(container.querySelector('form')!);
        });
        await waitFor(() => {
            expect(forgotPasswordMock).toHaveBeenCalledWith('a@b.com');
        });
        await waitFor(() => {
            expect(screen.getByRole('status')).toBeInTheDocument();
        });
    });

    test('uses custom successMessage when provided', async () => {
        forgotPasswordMock.mockResolvedValueOnce({});
        const { container } = renderForm({ successMessage: 'You got mail' });
        const input = container.querySelector('input')!;
        fireEvent.input(input, { target: { value: 'a@b.com' } });
        await act(async () => {
            fireEvent.submit(container.querySelector('form')!);
        });
        await waitFor(() => {
            expect(screen.getByText('You got mail')).toBeInTheDocument();
        });
    });

    test('navigates on success when redirect provided', async () => {
        forgotPasswordMock.mockResolvedValueOnce({});
        const { container } = renderForm({ onSuccessRedirect: '/done' });
        const input = container.querySelector('input')!;
        fireEvent.input(input, { target: { value: 'a@b.com' } });
        await act(async () => {
            fireEvent.submit(container.querySelector('form')!);
        });
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/done');
        });
    });

    test('lifts 422 errors into Formik', async () => {
        forgotPasswordMock.mockRejectedValueOnce({
            status: 422,
            data: { errors: { email: ['Unknown email'] } },
        });
        const { container } = renderForm();
        const input = container.querySelector('input')!;
        fireEvent.input(input, { target: { value: 'a@b.com' } });
        await act(async () => {
            fireEvent.submit(container.querySelector('form')!);
        });
        await waitFor(() => {
            expect(screen.getByText('Unknown email')).toBeInTheDocument();
        });
    });

    test('does not crash on 429', async () => {
        forgotPasswordMock.mockRejectedValueOnce({ status: 429 });
        const { container } = renderForm();
        const input = container.querySelector('input')!;
        fireEvent.input(input, { target: { value: 'a@b.com' } });
        await act(async () => {
            fireEvent.submit(container.querySelector('form')!);
        });
        await waitFor(() => {
            expect(forgotPasswordMock).toHaveBeenCalled();
        });
    });

    test('shows general error from data.message', async () => {
        forgotPasswordMock.mockRejectedValueOnce({
            status: 500,
            data: { message: 'Server down' },
        });
        const { container } = renderForm();
        const input = container.querySelector('input')!;
        fireEvent.input(input, { target: { value: 'a@b.com' } });
        await act(async () => {
            fireEvent.submit(container.querySelector('form')!);
        });
        await waitFor(() => {
            expect(screen.getByText('Server down')).toBeInTheDocument();
        });
    });

    test('falls back to default error message', async () => {
        forgotPasswordMock.mockRejectedValueOnce({ status: 500 });
        const { container } = renderForm();
        const input = container.querySelector('input')!;
        fireEvent.input(input, { target: { value: 'a@b.com' } });
        await act(async () => {
            fireEvent.submit(container.querySelector('form')!);
        });
        await waitFor(() => {
            expect(
                screen.getByText('Unable to send reset link. Please try again.')
            ).toBeInTheDocument();
        });
    });

    test('renders additionalFields', () => {
        render(
            <BrowserRouter>
                <ForgotPasswordForm
                    additionalFields={() => <input data-testid="extra" />}
                />
            </BrowserRouter>
        );
        expect(screen.getByTestId('extra')).toBeInTheDocument();
    });
});
