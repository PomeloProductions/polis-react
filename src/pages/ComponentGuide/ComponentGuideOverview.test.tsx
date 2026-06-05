import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import ComponentGuideOverview from './ComponentGuideOverview';

const renderPage = () =>
    render(
        <MemoryRouter>
            <MantineProvider>
                <ComponentGuideOverview />
            </MantineProvider>
        </MemoryRouter>
    );

describe('ComponentGuideOverview', () => {
    test('renders the main heading', () => {
        renderPage();
        expect(screen.getByRole('heading', { name: 'Component Guide' })).toBeInTheDocument();
    });

    test('renders each section heading', () => {
        renderPage();
        expect(screen.getByText('How Pages Work')).toBeInTheDocument();
        expect(screen.getByText('How Components Work')).toBeInTheDocument();
        expect(screen.getByText('Managing Your Pages')).toBeInTheDocument();
    });

    test('renders the page-type cards (Dashboard / List / Detail)', () => {
        renderPage();
        expect(screen.getByText('Dashboard Pages')).toBeInTheDocument();
        expect(screen.getByText('List Pages')).toBeInTheDocument();
        expect(screen.getByText('Detail Pages')).toBeInTheDocument();
    });

    test('renders link to the component catalog', () => {
        renderPage();
        const link = screen.getByRole('link', { name: /View Component Catalog/i });
        expect(link).toHaveAttribute('href', '/component-guide/components');
    });
});
