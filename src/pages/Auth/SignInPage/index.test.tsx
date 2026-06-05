import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import SignInPage from './index';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
}));

jest.mock('../../../services/requests/AuthRequests', () => ({
    __esModule: true,
    default: { signIn: jest.fn() },
    signIn: jest.fn(),
}));

const renderPage = (props: React.ComponentProps<typeof SignInPage> = {}) =>
    render(
        <MemoryRouter>
            <MantineProvider>
                <SignInPage {...props} />
            </MantineProvider>
        </MemoryRouter>
    );

describe('SignInPage', () => {
    test('renders heading with default app name', () => {
        renderPage();
        expect(screen.getByRole('heading', { name: /Sign in to Polis/i })).toBeInTheDocument();
    });

    test('renders custom branding.appName', () => {
        renderPage({ branding: { appName: 'MyApp' } });
        expect(screen.getByRole('heading', { name: /Sign in to MyApp/i })).toBeInTheDocument();
    });

    test('renders branding.logo node when provided', () => {
        renderPage({ branding: { logo: <div data-testid="logo" /> } });
        expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    test('renders the underlying SignInForm', () => {
        renderPage();
        expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    test('renders forgot password and sign-up cross-links', () => {
        renderPage();
        const forgotLink = screen.getByRole('link', { name: /Forgot your password/i });
        expect(forgotLink).toHaveAttribute('href', '/forgot-password');
        const signUpLink = screen.getByRole('link', { name: 'Sign up' });
        expect(signUpLink).toHaveAttribute('href', '/sign-up');
    });
});
