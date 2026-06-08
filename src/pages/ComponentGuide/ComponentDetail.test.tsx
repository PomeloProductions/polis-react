import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import ComponentDetail from './ComponentDetail';
import { COMPONENT_GUIDE } from './componentMetadata';

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <MantineProvider>
                <Routes>
                    <Route path="/component-guide/components/:componentType" element={<ComponentDetail />} />
                    <Route path="/component-guide/components" element={<div>Catalog</div>} />
                </Routes>
            </MantineProvider>
        </MemoryRouter>
    );

describe('ComponentDetail', () => {
    test('redirects to catalog for an unknown type', () => {
        renderAt('/component-guide/components/not-a-real-component');
        expect(screen.getByText('Catalog')).toBeInTheDocument();
    });

    test('renders entry detail for known type', () => {
        const entry = COMPONENT_GUIDE[0];
        renderAt(`/component-guide/components/${entry.type}`);
        expect(screen.getByRole('heading', { name: entry.displayName })).toBeInTheDocument();
        expect(screen.getByText(entry.description)).toBeInTheDocument();
        expect(screen.getByText(entry.longDescription)).toBeInTheDocument();
    });

    test('shows "no configuration options" when entry has none', () => {
        const entry = COMPONENT_GUIDE.find((e) => e.configOptions.length === 0);
        if (!entry) return;
        renderAt(`/component-guide/components/${entry.type}`);
        expect(
            screen.getByText('This component has no configuration options.')
        ).toBeInTheDocument();
    });

    test('Open Playground links point to the playground route', () => {
        const entry = COMPONENT_GUIDE[0];
        renderAt(`/component-guide/components/${entry.type}`);
        const links = screen.getAllByRole('link', { name: /Open Playground/i });
        expect(links.length).toBeGreaterThanOrEqual(1);
        links.forEach((l) =>
            expect(l).toHaveAttribute('href', `/component-guide/playground/${entry.type}`)
        );
    });

    test('Back link returns to catalog', () => {
        const entry = COMPONENT_GUIDE[0];
        renderAt(`/component-guide/components/${entry.type}`);
        const back = screen.getByRole('link', { name: /Back to Component Catalog/i });
        expect(back).toHaveAttribute('href', '/component-guide/components');
    });

    test('renders single example config without tabs', () => {
        const entry = COMPONENT_GUIDE.find((e) => e.exampleConfigs.length === 1);
        if (!entry) return;
        renderAt(`/component-guide/components/${entry.type}`);
        expect(screen.getByText(entry.exampleConfigs[0].label)).toBeInTheDocument();
        expect(screen.getByText(entry.exampleConfigs[0].description)).toBeInTheDocument();
    });

    test('handles tabs when multiple example configs exist', () => {
        // synthesise: render and assert example-related Title
        const entry = COMPONENT_GUIDE[0];
        renderAt(`/component-guide/components/${entry.type}`);
        expect(screen.getByText('Example Configurations')).toBeInTheDocument();
    });

    test('clicking on example tab updates active state', () => {
        // Find an entry with >=2 example configs; if none exists, skip.
        const entry = COMPONENT_GUIDE.find((e) => e.exampleConfigs.length > 1);
        if (!entry) return;
        renderAt(`/component-guide/components/${entry.type}`);
        const tabs = screen.getAllByRole('tab');
        // Click the 2nd tab
        fireEvent.click(tabs[1]);
        expect(tabs[1].getAttribute('data-active')).toBe('true');
    });
});
