import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import SignUpPage from './index';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../../services/requests/AuthRequests', () => ({
  __esModule: true,
  default: { signUp: jest.fn() },
}));

const renderPage = (props: React.ComponentProps<typeof SignUpPage> = {}) =>
  render(
    <MemoryRouter>
      <MantineProvider>
        <SignUpPage {...props} />
      </MantineProvider>
    </MemoryRouter>,
  );

describe('SignUpPage', () => {
  test('renders heading with default app name', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Create your Polis account/i })).toBeInTheDocument();
  });

  test('renders custom appName', () => {
    renderPage({ branding: { appName: 'MyApp' } });
    expect(screen.getByRole('heading', { name: /Create your MyApp account/i })).toBeInTheDocument();
  });

  test('renders branding.logo', () => {
    renderPage({ branding: { logo: <div data-testid="logo" /> } });
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  test('renders SignUpForm fields', () => {
    renderPage();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument();
  });

  test('renders Sign in cross-link to /sign-in', () => {
    renderPage();
    // Both the inner SignUpForm and the page itself render a "/sign-in" link.
    // The page-level one lives under "Already have an account?" text — assert
    // at least one such link exists and all sign-in links point to /sign-in.
    const signInLinks = screen.getAllByRole('link', { name: 'Sign in' });
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    signInLinks.forEach((link) => expect(link).toHaveAttribute('href', '/sign-in'));
  });
});
