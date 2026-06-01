import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
    getUserPages,
    createUserPage,
    updateUserPage,
    deleteUserPage,
    createUserPageComponent,
    updateUserPageComponent,
    deleteUserPageComponent,
} from '../services/requests/UserPageRequests';
import { UserPage, UserPageComponent } from '../models/user/user-page';
import { MeContext } from './MeContext';

interface UserPagesContextState {
    pages: UserPage[];
    loading: boolean;
    refreshPages: () => Promise<void>;
    getPageBySlug: (slug: string) => UserPage | undefined;
    addPage: (data: Partial<UserPage>) => Promise<UserPage>;
    editPage: (pageId: number, data: Partial<UserPage>) => Promise<UserPage>;
    removePage: (pageId: number) => Promise<void>;
    addComponent: (pageId: number, data: Partial<UserPageComponent>) => Promise<UserPageComponent>;
    editComponent: (pageId: number, componentId: number, data: Partial<UserPageComponent>) => Promise<UserPageComponent>;
    removeComponent: (pageId: number, componentId: number) => Promise<void>;
}

const defaultState: UserPagesContextState = {
    pages: [],
    loading: true,
    refreshPages: async () => {},
    getPageBySlug: () => undefined,
    addPage: async () => ({} as UserPage),
    editPage: async () => ({} as UserPage),
    removePage: async () => {},
    addComponent: async () => ({} as UserPageComponent),
    editComponent: async () => ({} as UserPageComponent),
    removeComponent: async () => {},
};

export const UserPagesContext = createContext<UserPagesContextState>(defaultState);

interface Props {
    children: React.ReactNode;
}

export const UserPagesContextProvider: React.FC<Props> = ({ children }) => {
    const { me } = useContext(MeContext);
    const [pages, setPages] = useState<UserPage[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPages = useCallback(async () => {
        if (!me?.id) return;
        try {
            setLoading(true);
            const response = await getUserPages(me.id!);
            setPages(response.data.data);
        } catch (e) {
            console.error('Failed to load user pages', e);
        } finally {
            setLoading(false);
        }
    }, [me?.id]);

    useEffect(() => {
        fetchPages();
    }, [fetchPages]);

    const getPageBySlug = useCallback(
        (slug: string) => pages.find((p) => p.slug === slug),
        [pages]
    );

    const addPage = useCallback(
        async (data: Partial<UserPage>) => {
            const response = await createUserPage(me.id!, data);
            await fetchPages();
            return response.data;
        },
        [me?.id, fetchPages]
    );

    const editPage = useCallback(
        async (pageId: number, data: Partial<UserPage>) => {
            const response = await updateUserPage(me.id!, pageId, data);
            setPages(prev => prev.map(page =>
                page.id === pageId ? { ...page, ...data, ...response.data } : page
            ));
            return response.data;
        },
        [me?.id]
    );

    const removePage = useCallback(
        async (pageId: number) => {
            await deleteUserPage(me.id!, pageId);
            await fetchPages();
        },
        [me?.id, fetchPages]
    );

    const addComponent = useCallback(
        async (pageId: number, data: Partial<UserPageComponent>) => {
            const response = await createUserPageComponent(me.id!, pageId, data);
            await fetchPages();
            return response.data;
        },
        [me?.id, fetchPages]
    );

    const editComponent = useCallback(
        async (pageId: number, componentId: number, data: Partial<UserPageComponent>) => {
            const response = await updateUserPageComponent(me.id!, pageId, componentId, data);
            setPages(prev => prev.map(page => {
                if (page.id !== pageId) return page;
                return {
                    ...page,
                    components: (page.components ?? []).map(comp =>
                        comp.id === componentId ? { ...comp, ...data } : comp
                    ),
                };
            }));
            return response.data;
        },
        [me?.id]
    );

    const removeComponent = useCallback(
        async (pageId: number, componentId: number) => {
            await deleteUserPageComponent(me.id!, pageId, componentId);
            await fetchPages();
        },
        [me?.id, fetchPages]
    );

    return (
        <UserPagesContext.Provider
            value={{
                pages,
                loading,
                refreshPages: fetchPages,
                getPageBySlug,
                addPage,
                editPage,
                removePage,
                addComponent,
                editComponent,
                removeComponent,
            }}
        >
            {children}
        </UserPagesContext.Provider>
    );
};
