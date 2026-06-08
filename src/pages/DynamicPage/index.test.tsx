import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

let userPagesValue: {
    pages: Array<{
        id: number;
        slug: string;
        name: string;
        page_type: string;
        route_path: string;
        is_nav_item: boolean;
        components?: unknown[];
    }>;
    loading: boolean;
};
jest.mock('../../contexts/UserPagesContext', () => {
    const React = jest.requireActual('react');
    const UserPagesContext = React.createContext({ pages: [], loading: false });
    return { __esModule: true, UserPagesContext };
});

let meValue: { me: { id?: number }; isLoggedIn: boolean };
jest.mock('../../contexts/MeContext', () => {
    const React = jest.requireActual('react');
    const MeContext = React.createContext({ me: {}, isLoggedIn: false });
    return { __esModule: true, MeContext, clearMeState: () => {} };
});

jest.mock('../../components/PageRenderer/index', () => ({
    __esModule: true,
    default: () => <div data-testid="page-renderer" />,
}));

jest.mock('../../components/PageRenderer/PageSettingsPanel', () => ({
    __esModule: true,
    default: () => <div data-testid="settings-panel" />,
}));

import DefaultDynamicPage from './index';
import { UserPagesContext } from '../../contexts/UserPagesContext';
import { MeContext } from '../../contexts/MeContext';

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <MantineProvider>
                <MeContext.Provider value={meValue as never}>
                    <UserPagesContext.Provider value={userPagesValue as never}>
                        <Routes>
                            <Route path="/p/:pageSlug" element={<DefaultDynamicPage />} />
                            <Route path="/p/:pageSlug/:param1" element={<DefaultDynamicPage />} />
                            <Route path="/" element={<DefaultDynamicPage />} />
                        </Routes>
                    </UserPagesContext.Provider>
                </MeContext.Provider>
            </MantineProvider>
        </MemoryRouter>
    );

beforeEach(() => {
    meValue = { me: { id: 42 }, isLoggedIn: true };
    userPagesValue = { pages: [], loading: false };
});

describe('DefaultDynamicPage', () => {
    test('shows loader when context is still loading', () => {
        userPagesValue = { pages: [], loading: true };
        renderAt('/p/home');
        // mantine Loader has role progressbar
        expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
    });

    test('shows loader when no user id', () => {
        meValue = { me: {}, isLoggedIn: false };
        renderAt('/p/home');
        expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
    });

    test('shows "Page not found" if slug does not match', () => {
        renderAt('/p/missing');
        expect(screen.getByText(/Page not found: missing/)).toBeInTheDocument();
    });

    test('renders a page when slug matches', () => {
        userPagesValue = {
            pages: [
                {
                    id: 1,
                    slug: 'home',
                    name: 'Home',
                    page_type: 'dashboard',
                    route_path: '/home',
                    is_nav_item: true,
                },
            ],
            loading: false,
        };
        renderAt('/p/home');
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByTestId('page-renderer')).toBeInTheDocument();
    });

    test('appends param1 to title for non-nav detail pages', () => {
        userPagesValue = {
            pages: [
                {
                    id: 1,
                    slug: 'thing',
                    name: 'Thing',
                    page_type: 'detail',
                    route_path: '/thing/:id',
                    is_nav_item: false,
                },
            ],
            loading: false,
        };
        renderAt('/p/thing/42');
        expect(screen.getByText('Thing — 42')).toBeInTheDocument();
    });
});
