import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

const getCollectionMock = jest.fn();
jest.mock('../services/requests/CollectionManagementRequests', () => ({
    __esModule: true,
    default: { getCollection: (...args: unknown[]) => getCollectionMock(...args) },
}));

jest.mock('../components/LoadingScreen', () => ({
    __esModule: true,
    default: () => <div data-testid="loading" />,
}));

import { CollectionContext, CollectionContextProvider } from './CollectionContext';

beforeEach(() => {
    getCollectionMock.mockReset();
});

const renderConsumer = (collectionId: number, skipCache = false) =>
    render(
        <CollectionContextProvider collectionId={collectionId} skipCache={skipCache}>
            <CollectionContext.Consumer>
                {(ctx) => (
                    <div data-testid="consumer">{ctx.collection?.id ?? 'none'}</div>
                )}
            </CollectionContext.Consumer>
        </CollectionContextProvider>
    );

describe('CollectionContext', () => {
    test('shows loading then collection on success', async () => {
        let resolve!: (v: unknown) => void;
        getCollectionMock.mockReturnValueOnce(new Promise((r) => (resolve = r)));
        renderConsumer(1, true);
        expect(screen.getByTestId('loading')).toBeInTheDocument();
        await act(async () => {
            resolve({ id: 1 });
        });
        await waitFor(() => {
            expect(screen.getByTestId('consumer')).toBeInTheDocument();
        });
    });

    test('renders deleted-collection message on rejection', async () => {
        getCollectionMock.mockRejectedValueOnce(new Error('nope'));
        renderConsumer(2, true);
        await waitFor(() => {
            expect(
                screen.getByText('This collection has been deleted')
            ).toBeInTheDocument();
        });
    });

    test('uses cache on subsequent mount', async () => {
        getCollectionMock.mockResolvedValueOnce({ id: 88 });
        const first = renderConsumer(88, false);
        await waitFor(() => {
            expect(first.getByTestId('consumer').textContent).toBe('88');
        });
        first.unmount();

        getCollectionMock.mockClear();
        renderConsumer(88, false);
        await waitFor(() => {
            expect(screen.getByTestId('consumer').textContent).toBe('88');
        });
        expect(getCollectionMock).not.toHaveBeenCalled();
    });
});
