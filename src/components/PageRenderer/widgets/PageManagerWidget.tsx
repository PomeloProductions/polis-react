import React from 'react';
import { Text, Paper } from '@mantine/core';
import { ComponentProps } from '../ComponentRegistry';

const PageManagerWidget: React.FC<ComponentProps> = () => {
    return (
        <Paper p="lg" radius="md" withBorder>
            <Text size="sm" c="dimmed">
                Page manager is rendered in the settings drawer.
            </Text>
        </Paper>
    );
};

export default PageManagerWidget;
