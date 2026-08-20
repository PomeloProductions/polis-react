import React, { useContext } from 'react';
import { Card, Group, SimpleGrid, Stack, Text, Title, ThemeIcon } from '@mantine/core';
import {
  IconChecklist,
  IconClock,
  IconChartBar,
  IconCalendar,
  IconSettings,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { MeContext } from '../../contexts/MeContext';

const LINKS: {
  to: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    to: '/todos/today',
    label: "Today's Todos",
    description: 'Your day page — tasks, budgets, and timers.',
    icon: <IconChecklist size={22} />,
    color: 'blue',
  },
  {
    to: '/todos/time-tracking',
    label: 'Time Tracking',
    description: 'Review and edit your logged time entries.',
    icon: <IconClock size={22} />,
    color: 'teal',
  },
  {
    to: '/todos/reports',
    label: 'Reports',
    description: 'How your hours add up over time.',
    icon: <IconChartBar size={22} />,
    color: 'grape',
  },
  {
    to: '/todos/calendars',
    label: 'Calendars',
    description: 'Work-day schedules, holidays, and vacation.',
    icon: <IconCalendar size={22} />,
    color: 'orange',
  },
  {
    to: '/settings',
    label: 'Settings',
    description: 'Account and app preferences.',
    icon: <IconSettings size={22} />,
    color: 'gray',
  },
];

/**
 * Friendly default for an empty dashboard: greet the user and route them to the key pages,
 * instead of the bare "Empty Page" alert.
 */
const WelcomeEmptyState: React.FC = () => {
  const { me } = useContext(MeContext);
  const navigate = useNavigate();

  const firstName = me?.first_name?.trim();

  return (
    <Stack gap="lg" py="md">
      <div>
        <Title order={2}>Welcome{firstName ? `, ${firstName}` : ''}!</Title>
        <Text c="dimmed" size="sm" mt={4}>
          Jump into one of your key pages below.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {LINKS.map((link) => (
          <Card
            key={link.to}
            withBorder
            radius="md"
            padding="md"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(link.to)}
          >
            <Group wrap="nowrap" align="flex-start">
              <ThemeIcon variant="light" color={link.color} size="lg" radius="md">
                {link.icon}
              </ThemeIcon>
              <div>
                <Text fw={600} size="sm">
                  {link.label}
                </Text>
                <Text size="xs" c="dimmed">
                  {link.description}
                </Text>
              </div>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <Text size="xs" c="dimmed">
        Tip: this dashboard is customizable — add widgets to it with the page manager.
      </Text>
    </Stack>
  );
};

export default WelcomeEmptyState;
