import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import StatsCardsWidget from './StatsCardsWidget';

const baseProps = {
    componentId: 1,
    onConfigChange: async () => {},
    onDisplayUpdate: () => {},
    userId: 7,
};

describe('StatsCardsWidget', () => {
    test('renders empty-state message when no cards configured', () => {
        render(
            <MantineProvider>
                <StatsCardsWidget {...baseProps} config={{}} />
            </MantineProvider>
        );
        expect(screen.getByText(/No stats cards configured/i)).toBeInTheDocument();
    });

    test('renders one card per configured stat', () => {
        render(
            <MantineProvider>
                <StatsCardsWidget
                    {...baseProps}
                    config={{
                        cards: [
                            { id: 'a', type: 'total_count', label: 'Total' },
                            { id: 'b', type: 'active_count' },
                        ],
                    }}
                />
            </MantineProvider>
        );
        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getByText('active count')).toBeInTheDocument();
    });
});
