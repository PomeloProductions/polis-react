import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import SettingsPanelWidget from './SettingsPanelWidget';

describe('SettingsPanelWidget', () => {
    test('renders the settings stub', () => {
        render(
            <MantineProvider>
                <SettingsPanelWidget
                    componentId={1}
                    config={{}}
                    onConfigChange={async () => {}}
                    onDisplayUpdate={() => {}}
                    userId={7}
                />
            </MantineProvider>
        );
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText(/User settings panel/i)).toBeInTheDocument();
    });
});
