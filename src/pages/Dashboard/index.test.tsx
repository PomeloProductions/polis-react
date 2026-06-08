import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

// Mock MeContextProvider to avoid hitting the real auth bootstrap. We expose a
// mutable `__meState` so individual tests can flip between logged-out and
// logged-in. The placeholderUser export is also faked.
type FakeUser = { id?: number; first_name?: string; last_name?: string };
let mockMeState: {
  me: FakeUser;
  isLoggedIn: boolean;
  isLoading: boolean;
  networkError: boolean;
  setMe: (u: FakeUser) => void;
};

jest.mock('../../contexts/MeContext', () => {
  const React = jest.requireActual('react');
  const MeContext = React.createContext({
    me: {},
    isLoggedIn: false,
    isLoading: false,
    networkError: false,
    setMe: () => {},
  });
  const MeContextProvider = ({ children }: { children: React.ReactNode }) =>
    React.createElement(MeContext.Provider, { value: mockMeState }, children);
  return {
    __esModule: true,
    default: MeContextProvider,
    MeContext,
    clearMeState: () => {},
  };
});

import DashboardPage from './index';

const renderPage = (props: React.ComponentProps<typeof DashboardPage> = {}) =>
  render(
    <MemoryRouter>
      <MantineProvider>
        <DashboardPage {...props} />
      </MantineProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  mockMeState = {
    me: {},
    isLoggedIn: false,
    isLoading: false,
    networkError: false,
    setMe: () => {},
  };
});

describe('DashboardPage', () => {
  test('renders default heading when not logged in', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Welcome to Polis/i })).toBeInTheDocument();
  });

  test('uses custom appName when not logged in', () => {
    renderPage({ branding: { appName: 'MyApp' } });
    expect(screen.getByRole('heading', { name: /Welcome to MyApp/i })).toBeInTheDocument();
  });

  test('renders branding.logo', () => {
    renderPage({ branding: { logo: <div data-testid="logo" /> } });
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  test('renders default placeholder copy', () => {
    renderPage();
    expect(screen.getByText(/placeholder dashboard/i)).toBeInTheDocument();
  });

  test('renders custom children when provided', () => {
    renderPage({ children: <p data-testid="custom-dashboard">Custom content</p> });
    expect(screen.getByTestId('custom-dashboard')).toBeInTheDocument();
    expect(screen.queryByText(/placeholder dashboard/i)).not.toBeInTheDocument();
  });

  test('greets the user by first name when logged in', () => {
    mockMeState = {
      me: { id: 1, first_name: 'Ada', last_name: 'Lovelace' },
      isLoggedIn: true,
      isLoading: false,
      networkError: false,
      setMe: () => {},
    };
    renderPage();
    expect(screen.getByRole('heading', { name: /Welcome back, Ada/i })).toBeInTheDocument();
  });
});
