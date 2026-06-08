import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import ResetPasswordPage from './index';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../../services/requests/ResetPasswordRequests', () => ({
  __esModule: true,
  default: { resetPassword: jest.fn() },
}));

const renderPage = (
  initialEntries: string[],
  props: React.ComponentProps<typeof ResetPasswordPage> = {},
) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <MantineProvider>
        <ResetPasswordPage {...props} />
      </MantineProvider>
    </MemoryRouter>,
  );

describe('ResetPasswordPage', () => {
  test('reads token + email from query string', () => {
    renderPage(['/reset?token=abc&email=a%40b.com']);
    expect(screen.getByRole('heading', { name: /Reset your Polis password/i })).toBeInTheDocument();
    // form is rendered (button visible)
    expect(screen.getByRole('button', { name: /Reset Password/i })).toBeInTheDocument();
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
  });

  test('uses custom appName in heading', () => {
    renderPage(['/reset?token=t&email=e@e.com'], { branding: { appName: 'MyApp' } });
    expect(screen.getByRole('heading', { name: /Reset your MyApp password/i })).toBeInTheDocument();
  });

  test('renders branding.logo', () => {
    renderPage(['/reset?token=t&email=e@e.com'], {
      branding: { logo: <div data-testid="logo" /> },
    });
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  test('shows missing-token warning when query is incomplete', () => {
    renderPage(['/reset']);
    expect(screen.getByText(/missing a token or email/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reset Password/i })).not.toBeInTheDocument();
  });

  test('supports token/email prop overrides', () => {
    renderPage(['/reset'], { token: 'override-tok', email: 'override@x.com' });
    expect(screen.getByText('override@x.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset Password/i })).toBeInTheDocument();
  });

  test('renders Back to sign in link', () => {
    renderPage(['/reset?token=t&email=e@e.com']);
    const link = screen.getByRole('link', { name: /Back to sign in/i });
    expect(link).toHaveAttribute('href', '/sign-in');
  });
});
