import React from 'react';
import { Text, Paper, SimpleGrid } from '@mantine/core';
import { ComponentProps } from '../ComponentRegistry';

interface StatsCard {
    id: string;
    type: string;
    label?: string;
}

const StatsCardsWidget: React.FC<ComponentProps> = ({ config }) => {
    const cards = (config.cards as StatsCard[]) ?? [];

    if (cards.length === 0) {
        return (
            <Text size="sm" c="dimmed">
                No stats cards configured. Use the gear icon to add cards.
            </Text>
        );
    }

    return (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
            {cards.map((card) => (
                <Paper key={card.id} p="md" radius="md" withBorder>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                        {card.label ?? card.type.replace(/_/g, ' ')}
                    </Text>
                    <Text size="xl" fw={700}>
                        --
                    </Text>
                </Paper>
            ))}
        </SimpleGrid>
    );
};

export default StatsCardsWidget;
