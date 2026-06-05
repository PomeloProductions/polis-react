import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

const getUserMock = jest.fn();
jest.mock('../services/requests/UserRequests', () => ({
    __esModule: true,
    default: { getUser: (...args: unknown[]) => getUserMock(...args) },
}));

jest.mock('../components/LoadingScreen', () => ({
    __esModule: true,
    default: () => <div data-testid="loading" />,
}));

import { UserContext, UserContextProvider } from './UserContext';

beforeEach(() => {
    getUserMock.mockReset();
});

const renderConsumer = (userId: number, skipCache = false) =>
    render(
        <UserContextProvider userId={userId} skipCache={skipCache}>
            <UserContext.Consumer>
                {(ctx) => (
                    <div data-testid="consumer">
                        {ctx.user?.id ?? 'no-user'}
                    </div>
                )}
            </UserContext.Consumer>
        </UserContextProvider>
    );

describe('UserContext', () => {
    test('shows LoadingScreen until request resolves, then renders user', async () => {
        let resolveUser!: (u: unknown) => void;
        getUserMock.mockReturnValueOnce(new Promise((r) => (resolveUser = r)));
        renderConsumer(1, true);
        expect(screen.getByTestId('loading')).toBeInTheDocument();
        await act(async () => {
            resolveUser({ id: 1, first_name: 'A' });
        });
        await waitFor(() => {
            expect(screen.getByTestId('consumer')).toBeInTheDocument();
        });
    });

    test('renders not-found UI on request failure', async () => {
        getUserMock.mockRejectedValueOnce(new Error('nope'));
        renderConsumer(2, true);
        await waitFor(() => {
            expect(screen.getByText('Not Found')).toBeInTheDocument();
        });
    });

    test('reuses cached user without re-requesting', async () => {
        // Prime cache by performing a successful fetch first.
        getUserMock.mockResolvedValueOnce({ id: 42, first_name: 'X' });
        const first = renderConsumer(42, false);
        await waitFor(() => {
            expect(first.getByTestId('consumer').textContent).toBe('42');
        });
        first.unmount();

        // Second render with same id should not call the API again.
        getUserMock.mockClear();
        renderConsumer(42, false);
        // Cached path is synchronous — assert no further call.
        await waitFor(() => {
            expect(screen.getByTestId('consumer').textContent).toBe('42');
        });
        expect(getUserMock).not.toHaveBeenCalled();
    });
});
