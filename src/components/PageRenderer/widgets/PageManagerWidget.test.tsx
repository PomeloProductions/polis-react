import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import PageManagerWidget from './PageManagerWidget';

describe('PageManagerWidget', () => {
    test('renders the drawer-redirect message', () => {
        render(
            <MantineProvider>
                <PageManagerWidget
                    componentId={1}
                    config={{}}
                    onConfigChange={async () => {}}
                    onDisplayUpdate={() => {}}
                    userId={7}
                />
            </MantineProvider>
        );
        expect(
            screen.getByText(/Page manager is rendered in the settings drawer/i)
        ).toBeInTheDocument();
    });
});
