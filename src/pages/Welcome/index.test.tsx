import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import WelcomePage from './index';

const renderPage = (props: React.ComponentProps<typeof WelcomePage> = {}) =>
  render(
    <MemoryRouter>
      <MantineProvider>
        <WelcomePage {...props} />
      </MantineProvider>
    </MemoryRouter>,
  );

describe('WelcomePage', () => {
  test('renders default heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Welcome to Polis/i })).toBeInTheDocument();
  });

  test('renders custom appName', () => {
    renderPage({ branding: { appName: 'MyApp' } });
    expect(screen.getByRole('heading', { name: /Welcome to MyApp/i })).toBeInTheDocument();
  });

  test('renders branding.logo', () => {
    renderPage({ branding: { logo: <div data-testid="logo" /> } });
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  test('renders default copy when no children supplied', () => {
    renderPage();
    expect(screen.getByText(/Sign in to your account or create a new one/i)).toBeInTheDocument();
  });

  test('renders custom children when provided (and hides default copy)', () => {
    renderPage({ children: <p data-testid="custom-copy">Hi friend</p> });
    expect(screen.getByTestId('custom-copy')).toBeInTheDocument();
    expect(
      screen.queryByText(/Sign in to your account or create a new one/i),
    ).not.toBeInTheDocument();
  });

  test('Sign in button uses default /sign-in route', () => {
    renderPage();
    const link = screen.getByRole('link', { name: 'Sign in' });
    expect(link).toHaveAttribute('href', '/sign-in');
  });

  test('Sign up button uses default /sign-up route', () => {
    renderPage();
    const link = screen.getByRole('link', { name: 'Sign up' });
    expect(link).toHaveAttribute('href', '/sign-up');
  });

  test('respects signInTo / signUpTo overrides', () => {
    renderPage({ signInTo: '/login', signUpTo: '/register' });
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/register');
  });
});
