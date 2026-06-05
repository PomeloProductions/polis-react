import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

// Mock MeContext
let meValue: { me: { id?: number }; isLoggedIn: boolean };
jest.mock('../../contexts/MeContext', () => {
    const React = jest.requireActual('react');
    const MeContext = React.createContext({ me: {}, isLoggedIn: false });
    return { __esModule: true, MeContext, clearMeState: () => {} };
});

// Default registry mock: no component for "missing-type", a stub Component
// for "stats_cards"
jest.mock('../../components/PageRenderer/ComponentRegistry', () => {
    const React = jest.requireActual('react');
    const Stub: React.FC = () =>
        React.createElement('div', { 'data-testid': 'rendered-widget' });
    return {
        __esModule: true,
        getComponent: (t: string) => (t === 'stats_cards' ? Stub : null),
        getRegisteredTypes: () => ['stats_cards'],
    };
});

// Mock UserPagesContext (consumed transitively via AddToPageModal)
jest.mock('../../contexts/UserPagesContext', () => {
    const React = jest.requireActual('react');
    const UserPagesContext = React.createContext({
        pages: [],
        addComponent: jest.fn(),
    });
    return { __esModule: true, UserPagesContext };
});

import ComponentPlayground from './ComponentPlayground';
import { MeContext } from '../../contexts/MeContext';

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <MantineProvider>
                <MeContext.Provider value={meValue as never}>
                    <Routes>
                        <Route
                            path="/component-guide/playground/:componentType"
                            element={<ComponentPlayground />}
                        />
                        <Route
                            path="/component-guide/components"
                            element={<div>Catalog</div>}
                        />
                    </Routes>
                </MeContext.Provider>
            </MantineProvider>
        </MemoryRouter>
    );

beforeEach(() => {
    meValue = { me: {}, isLoggedIn: false };
});

describe('ComponentPlayground', () => {
    test('redirects to catalog if component type is unknown', () => {
        renderAt('/component-guide/playground/nonexistent');
        expect(screen.getByText('Catalog')).toBeInTheDocument();
    });

    test('renders heading + tabs for known component', () => {
        renderAt('/component-guide/playground/stats_cards');
        expect(screen.getByRole('heading', { name: /Stats Cards/i })).toBeInTheDocument();
        // 'Add to Page' button is disabled when logged out
        const addBtn = screen.getByRole('button', { name: /^Add to Page$/i });
        expect(addBtn).toBeDisabled();
    });

    test('shows sign-in alert when not logged in', () => {
        renderAt('/component-guide/playground/stats_cards');
        expect(
            screen.getByText(/Sign in to render live component previews/i)
        ).toBeInTheDocument();
    });

    test('renders widget stub when logged in', () => {
        meValue = { me: { id: 7 }, isLoggedIn: true };
        renderAt('/component-guide/playground/stats_cards');
        expect(screen.getAllByTestId('rendered-widget').length).toBeGreaterThanOrEqual(1);
    });

    test('Back link points to catalog', () => {
        renderAt('/component-guide/playground/stats_cards');
        const back = screen.getByRole('link', { name: /Component Catalog/i });
        expect(back).toHaveAttribute('href', '/component-guide/components');
    });
});
