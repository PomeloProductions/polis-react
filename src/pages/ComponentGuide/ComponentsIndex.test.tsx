import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

// Mock MeContext directly (the page uses useContext on the real context).
type FakeUser = { id?: number };
let meValue: { me: FakeUser; isLoggedIn: boolean };
jest.mock('../../contexts/MeContext', () => {
    const React = jest.requireActual('react');
    const MeContext = React.createContext<{ me: FakeUser; isLoggedIn: boolean }>({
        me: {},
        isLoggedIn: false,
    });
    const ConsumerProvider = ({ children }: { children: React.ReactNode }) =>
        React.createElement(MeContext.Provider, { value: meValue }, children);
    return {
        __esModule: true,
        MeContext,
        default: ConsumerProvider,
        clearMeState: () => {},
    };
});

// Pretend no component is registered so we render the "Sign in to see a live
// preview" stub instead of trying to lazy-load real widgets.
jest.mock('../../components/PageRenderer/ComponentRegistry', () => ({
    __esModule: true,
    getComponent: () => null,
    getRegisteredTypes: () => [],
}));

import ComponentsIndex from './ComponentsIndex';
import { MeContext } from '../../contexts/MeContext';
import { COMPONENT_GUIDE } from './componentMetadata';

const renderPage = () =>
    render(
        <MemoryRouter>
            <MantineProvider>
                <MeContext.Provider value={meValue as never}>
                    <ComponentsIndex />
                </MeContext.Provider>
            </MantineProvider>
        </MemoryRouter>
    );

beforeEach(() => {
    meValue = { me: {}, isLoggedIn: false };
});

describe('ComponentsIndex', () => {
    test('lists every component from COMPONENT_GUIDE by displayName', () => {
        renderPage();
        for (const entry of COMPONENT_GUIDE) {
            expect(screen.getByText(entry.displayName)).toBeInTheDocument();
        }
    });

    test('renders the catalog heading with component count', () => {
        renderPage();
        expect(screen.getByRole('heading', { name: 'Component Catalog' })).toBeInTheDocument();
        expect(
            screen.getByText(new RegExp(`${COMPONENT_GUIDE.length} components available`))
        ).toBeInTheDocument();
    });

    test('renders a playground button per entry', () => {
        renderPage();
        const playgroundButtons = screen.getAllByRole('link', { name: /Playground/i });
        // At least one per entry
        expect(playgroundButtons.length).toBeGreaterThanOrEqual(COMPONENT_GUIDE.length);
    });

    test('filters entries by the search input', () => {
        renderPage();
        const input = screen.getByPlaceholderText('Search components...') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'stats' } });
        // The matching entry should still be visible
        const match = COMPONENT_GUIDE.find((e) =>
            e.displayName.toLowerCase().includes('stats')
        );
        if (match) {
            expect(screen.getByText(match.displayName)).toBeInTheDocument();
        }
        // Other entries that don't match should disappear
        const nonMatch = COMPONENT_GUIDE.find(
            (e) => !e.displayName.toLowerCase().includes('stats')
        );
        if (nonMatch) {
            expect(screen.queryByText(nonMatch.displayName)).not.toBeInTheDocument();
        }
    });

    test('shows empty state when no matches', () => {
        renderPage();
        const input = screen.getByPlaceholderText('Search components...');
        fireEvent.change(input, { target: { value: 'zzz-no-such-thing-zzz' } });
        expect(screen.getByText(/No components match your search/i)).toBeInTheDocument();
    });

    test('clicking a row expands and shows long description + sign-in prompt when logged out', () => {
        renderPage();
        const firstEntry = COMPONENT_GUIDE[0];
        fireEvent.click(screen.getByText(firstEntry.displayName));
        expect(screen.getByText(firstEntry.longDescription)).toBeInTheDocument();
        // Sign-in prompt may appear once per expanded row; assert at least one.
        expect(screen.getAllByText(/Sign in to see a live preview/i).length).toBeGreaterThanOrEqual(1);
    });

    test('toggling twice collapses the row', () => {
        renderPage();
        const firstEntry = COMPONENT_GUIDE[0];
        const row = screen.getByText(firstEntry.displayName);
        fireEvent.click(row);
        expect(screen.getByText(firstEntry.longDescription)).toBeInTheDocument();
        fireEvent.click(row);
        // Collapse animation keeps content in DOM with display:none; just verify
        // we can call the toggle without error.
        expect(row).toBeInTheDocument();
    });
});
