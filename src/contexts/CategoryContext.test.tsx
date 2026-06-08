import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

const getCategoryMock = jest.fn();
jest.mock('../services/requests/CategoryRequests', () => ({
  __esModule: true,
  default: { getCategory: (...args: unknown[]) => getCategoryMock(...args) },
}));

jest.mock('../components/LoadingScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="loading" />,
}));

import { CategoryContext, CategoryContextProvider } from './CategoryContext';

beforeEach(() => {
  getCategoryMock.mockReset();
});

const renderConsumer = (categoryId: number, skipCache = false) =>
  render(
    <CategoryContextProvider categoryId={categoryId} skipCache={skipCache}>
      <CategoryContext.Consumer>
        {(ctx) => <div data-testid="consumer">{ctx.category?.id ?? 'no-cat'}</div>}
      </CategoryContext.Consumer>
    </CategoryContextProvider>,
  );

describe('CategoryContext', () => {
  test('shows loading then category on success', async () => {
    let resolve!: (v: unknown) => void;
    getCategoryMock.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    renderConsumer(1, true);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    await act(async () => {
      resolve({ id: 1, name: 'Cat' });
    });
    await waitFor(() => {
      expect(screen.getByTestId('consumer')).toBeInTheDocument();
    });
  });

  test('renders not-found on rejection', async () => {
    getCategoryMock.mockRejectedValueOnce(new Error('nope'));
    renderConsumer(2, true);
    await waitFor(() => {
      expect(screen.getByText('Not Found')).toBeInTheDocument();
    });
  });

  test('uses cached category on second mount', async () => {
    getCategoryMock.mockResolvedValueOnce({ id: 77, name: 'Cached' });
    const first = renderConsumer(77, false);
    await waitFor(() => {
      expect(first.getByTestId('consumer').textContent).toBe('77');
    });
    first.unmount();

    getCategoryMock.mockClear();
    renderConsumer(77, false);
    await waitFor(() => {
      expect(screen.getByTestId('consumer').textContent).toBe('77');
    });
    expect(getCategoryMock).not.toHaveBeenCalled();
  });
});
