import React from 'react';
import { Text, Paper, Stack } from '@mantine/core';
import { ComponentProps } from '../ComponentRegistry';

const SettingsPanelWidget: React.FC<ComponentProps> = () => {
  return (
    <Paper p="lg" radius="md" withBorder>
      <Stack gap="md">
        <Text size="lg" fw={600}>
          Settings
        </Text>
        <Text size="sm" c="dimmed">
          User settings panel. Configure your preferences here.
        </Text>
      </Stack>
    </Paper>
  );
};

export default SettingsPanelWidget;
