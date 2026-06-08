import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

const getUserPages = jest.fn();
const createUserPage = jest.fn();
const updateUserPage = jest.fn();
const deleteUserPage = jest.fn();
const createUserPageComponent = jest.fn();
const updateUserPageComponent = jest.fn();
const deleteUserPageComponent = jest.fn();

jest.mock('../services/requests/UserPageRequests', () => ({
    __esModule: true,
    getUserPages: (...args: unknown[]) => getUserPages(...args),
    createUserPage: (...args: unknown[]) => createUserPage(...args),
    updateUserPage: (...args: unknown[]) => updateUserPage(...args),
    deleteUserPage: (...args: unknown[]) => deleteUserPage(...args),
    createUserPageComponent: (...args: unknown[]) => createUserPageComponent(...args),
    updateUserPageComponent: (...args: unknown[]) => updateUserPageComponent(...args),
    deleteUserPageComponent: (...args: unknown[]) => deleteUserPageComponent(...args),
}));

// Mock MeContext to provide a logged-in user.
let meValue: { me: { id?: number } };
jest.mock('./MeContext', () => {
    const React = jest.requireActual('react');
    const MeContext = React.createContext({ me: {} });
    return { __esModule: true, MeContext, clearMeState: () => {} };
});

import {
    UserPagesContext,
    UserPagesContextProvider,
} from './UserPagesContext';
import { MeContext } from './MeContext';

const renderWithProvider = (
    onCtx: (ctx: ReturnType<typeof React.useContext<typeof UserPagesContext>>) => React.ReactNode
) =>
    render(
        <MeContext.Provider value={meValue as never}>
            <UserPagesContextProvider>
                <UserPagesContext.Consumer>
                    {(ctx) => <>{onCtx(ctx as never)}</>}
                </UserPagesContext.Consumer>
            </UserPagesContextProvider>
        </MeContext.Provider>
    );

beforeEach(() => {
    meValue = { me: { id: 7 } };
    getUserPages.mockReset();
    createUserPage.mockReset();
    updateUserPage.mockReset();
    deleteUserPage.mockReset();
    createUserPageComponent.mockReset();
    updateUserPageComponent.mockReset();
    deleteUserPageComponent.mockReset();
});

describe('UserPagesContext', () => {
    test('fetches pages on mount when user has id', async () => {
        getUserPages.mockResolvedValueOnce({
            data: { data: [{ id: 1, slug: 'home' }] },
        });
        renderWithProvider(() => null);
        await waitFor(() => {
            expect(getUserPages).toHaveBeenCalledWith(7);
        });
    });

    test('skips fetch when user has no id', () => {
        meValue = { me: {} };
        renderWithProvider(() => null);
        expect(getUserPages).not.toHaveBeenCalled();
    });

    test('logs error and finishes loading on fetch failure', async () => {
        const consoleErr = jest.spyOn(console, 'error').mockImplementation(() => {});
        getUserPages.mockRejectedValueOnce(new Error('boom'));
        let ctxRef: { loading?: boolean } = {};
        renderWithProvider((ctx) => {
            ctxRef = ctx as never;
            return null;
        });
        await waitFor(() => {
            expect(ctxRef.loading).toBe(false);
        });
        expect(consoleErr).toHaveBeenCalled();
        consoleErr.mockRestore();
    });

    test('getPageBySlug returns matching page', async () => {
        getUserPages.mockResolvedValueOnce({
            data: { data: [{ id: 1, slug: 'home' }, { id: 2, slug: 'about' }] },
        });
        let bySlug: (s: string) => unknown = () => undefined;
        renderWithProvider((ctx) => {
            bySlug = (ctx as { getPageBySlug: (s: string) => unknown }).getPageBySlug;
            return null;
        });
        await waitFor(() => expect(getUserPages).toHaveBeenCalled());
        await waitFor(() => {
            expect(bySlug('home')).toEqual({ id: 1, slug: 'home' });
        });
        expect(bySlug('nope')).toBeUndefined();
    });

    test('addPage delegates to createUserPage and re-fetches', async () => {
        getUserPages.mockResolvedValueOnce({ data: { data: [] } });
        getUserPages.mockResolvedValueOnce({ data: { data: [{ id: 1, slug: 'x' }] } });
        createUserPage.mockResolvedValueOnce({ data: { id: 1, slug: 'x' } });
        let add!: (d: unknown) => Promise<unknown>;
        renderWithProvider((ctx) => {
            add = (ctx as { addPage: typeof add }).addPage;
            return null;
        });
        await waitFor(() => expect(getUserPages).toHaveBeenCalled());
        await act(async () => {
            await add({ slug: 'x' });
        });
        expect(createUserPage).toHaveBeenCalledWith(7, { slug: 'x' });
        expect(getUserPages).toHaveBeenCalledTimes(2);
    });

    test('editPage delegates to updateUserPage', async () => {
        getUserPages.mockResolvedValueOnce({
            data: { data: [{ id: 5, slug: 'home', name: 'Home' }] },
        });
        updateUserPage.mockResolvedValueOnce({ data: { id: 5, name: 'New' } });
        let edit!: (id: number, d: unknown) => Promise<unknown>;
        renderWithProvider((ctx) => {
            edit = (ctx as { editPage: typeof edit }).editPage;
            return null;
        });
        await waitFor(() => expect(getUserPages).toHaveBeenCalled());
        await act(async () => {
            await edit(5, { name: 'New' });
        });
        expect(updateUserPage).toHaveBeenCalledWith(7, 5, { name: 'New' });
    });

    test('removePage delegates to deleteUserPage and re-fetches', async () => {
        getUserPages.mockResolvedValueOnce({
            data: { data: [{ id: 5, slug: 'a' }] },
        });
        getUserPages.mockResolvedValueOnce({ data: { data: [] } });
        deleteUserPage.mockResolvedValueOnce({});
        let remove!: (id: number) => Promise<void>;
        renderWithProvider((ctx) => {
            remove = (ctx as { removePage: typeof remove }).removePage;
            return null;
        });
        await waitFor(() => expect(getUserPages).toHaveBeenCalled());
        await act(async () => {
            await remove(5);
        });
        expect(deleteUserPage).toHaveBeenCalledWith(7, 5);
        expect(getUserPages).toHaveBeenCalledTimes(2);
    });

    test('addComponent / editComponent / removeComponent delegate', async () => {
        getUserPages.mockResolvedValue({
            data: { data: [{ id: 5, slug: 'a', components: [{ id: 9 }] }] },
        });
        createUserPageComponent.mockResolvedValueOnce({ data: { id: 9 } });
        updateUserPageComponent.mockResolvedValueOnce({ data: { id: 9 } });
        deleteUserPageComponent.mockResolvedValueOnce({});
        let ctxRef!: {
            addComponent: (p: number, d: unknown) => Promise<unknown>;
            editComponent: (p: number, c: number, d: unknown) => Promise<unknown>;
            removeComponent: (p: number, c: number) => Promise<void>;
        };
        renderWithProvider((ctx) => {
            ctxRef = ctx as never;
            return null;
        });
        await waitFor(() => expect(getUserPages).toHaveBeenCalled());
        await act(async () => {
            await ctxRef.addComponent(5, { component_type: 'x' });
        });
        expect(createUserPageComponent).toHaveBeenCalled();
        await act(async () => {
            await ctxRef.editComponent(5, 9, { config_json: {} });
        });
        expect(updateUserPageComponent).toHaveBeenCalled();
        await act(async () => {
            await ctxRef.removeComponent(5, 9);
        });
        expect(deleteUserPageComponent).toHaveBeenCalled();
    });
});
