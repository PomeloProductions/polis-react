import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  CategoriesContext,
  CategoriesContextProvider,
  __resetCategoriesStateForTests,
} from './CategoriesContext';

// Mock the api module. Categories are returned under `data.data` with paging in `meta`.
jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        data: [
          { id: 1, name: 'Action', description: 'Action games', can_be_primary: true },
          { id: 2, name: 'RPG', description: 'Role-playing games', can_be_primary: true },
        ],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 10,
          total: 2,
        },
      },
    }),
  },
}));

describe('CategoriesContext', () => {
  // CategoriesContext keeps a module-level persistent state shared across
  // provider instances. Reset it between tests so one test's (now deferred)
  // initial load can't leave `initiated=true` with no data and block the next.
  beforeEach(() => {
    __resetCategoriesStateForTests();
  });

  const TestComponent = () => {
    const context = React.useContext(CategoriesContext);
    return (
      <div>
        <span data-testid="has-another-page">{context.hasAnotherPage.toString()}</span>
        <span data-testid="initial-load-complete">{context.initialLoadComplete.toString()}</span>
        <span data-testid="initiated">{context.initiated.toString()}</span>
        <span data-testid="no-results">{context.noResults.toString()}</span>
        <span data-testid="refreshing">{context.refreshing.toString()}</span>
        <span data-testid="expands">{context.expands.join(',')}</span>
        <span data-testid="loaded-data-count">{context.loadedData.length}</span>
      </div>
    );
  };

  it('provides default context values', () => {
    render(
      <CategoriesContextProvider>
        <TestComponent />
      </CategoriesContextProvider>,
    );

    expect(screen.getByTestId('has-another-page')).toHaveTextContent('false');
    // The initial load is deferred (setTimeout), so on the synchronous first
    // render it has not completed yet.
    expect(screen.getByTestId('initial-load-complete')).toHaveTextContent('false');
    expect(screen.getByTestId('initiated')).toHaveTextContent('true');
    expect(screen.getByTestId('no-results')).toHaveTextContent('false');
    expect(screen.getByTestId('refreshing')).toHaveTextContent('false');
    expect(screen.getByTestId('expands')).toHaveTextContent('');
  });

  it('persists state across multiple instances', async () => {
    const { rerender } = render(
      <CategoriesContextProvider>
        <TestComponent />
      </CategoriesContextProvider>,
    );

    // The initial load is deferred (setTimeout) so the two mocked categories
    // arrive asynchronously; wait for them rather than assuming a synchronous load.
    await waitFor(() => {
      expect(screen.getByTestId('loaded-data-count')).toHaveTextContent('2');
    });

    // Re-render with a new provider
    rerender(
      <CategoriesContextProvider>
        <TestComponent />
      </CategoriesContextProvider>,
    );

    // The state should be persisted
    await waitFor(() => {
      expect(screen.getByTestId('loaded-data-count')).toHaveTextContent('2');
    });
  });
});
