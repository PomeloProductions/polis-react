import React from 'react';
import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MeContextProvider } from './mocks/contexts';
import { MemoryRouter } from 'react-router-dom';
import { CategoriesContext, CategoriesContextState } from '../contexts/CategoriesContext';

// Import mocks
import './mocks/requests';

interface RouterOptions {
  route?: string;
}

interface ProviderOptions extends RouterOptions {
  value?: CategoriesContextState;
}

export const renderWithRouter = (
  component: React.ReactElement,
  { route = '/' }: RouterOptions = {},
) => {
  return {
    ...render(
      <MemoryRouter initialEntries={[route]}>
        <MantineProvider>
          <MeContextProvider>{component}</MeContextProvider>
        </MantineProvider>
      </MemoryRouter>,
    ),
  };
};

export const renderWithProviders = (
  component: React.ReactElement,
  { route = '/', value }: ProviderOptions = {},
) => {
  const wrappedComponent = value ? (
    <CategoriesContext.Provider value={value}>{component}</CategoriesContext.Provider>
  ) : (
    component
  );

  return renderWithRouter(wrappedComponent, { route });
};

// Re-export mocks
export { mockHistory, mockNavigate, mockUseParams, mockLocation } from './mocks/external';
export { MeContextProvider } from './mocks/contexts';

// Re-export everything
export * from '@testing-library/react';
