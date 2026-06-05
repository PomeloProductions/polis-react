import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import ForgotPasswordPage from './index';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
}));

jest.mock('../../../services/requests/ResetPasswordRequests', () => ({
    __esModule: true,
    default: { forgotPassword: jest.fn() },
}));

const renderPage = (props: React.ComponentProps<typeof ForgotPasswordPage> = {}) =>
    render(
        <MemoryRouter>
            <MantineProvider>
                <ForgotPasswordPage {...props} />
            </MantineProvider>
        </MemoryRouter>
    );

describe('ForgotPasswordPage', () => {
    test('renders heading', () => {
        renderPage();
        expect(screen.getByRole('heading', { name: /Forgot your password/i })).toBeInTheDocument();
    });

    test('uses default app name "Polis" in body copy', () => {
        renderPage();
        expect(screen.getByText(/Polis account/)).toBeInTheDocument();
    });

    test('uses custom appName', () => {
        renderPage({ branding: { appName: 'MyApp' } });
        expect(screen.getByText(/MyApp account/)).toBeInTheDocument();
    });

    test('renders branding.logo', () => {
        renderPage({ branding: { logo: <div data-testid="logo" /> } });
        expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    test('renders the underlying form', () => {
        renderPage();
        expect(screen.getByRole('button', { name: /Send reset link/i })).toBeInTheDocument();
    });

    test('renders Back to sign in link', () => {
        renderPage();
        const link = screen.getByRole('link', { name: /Back to sign in/i });
        expect(link).toHaveAttribute('href', '/sign-in');
    });
});
