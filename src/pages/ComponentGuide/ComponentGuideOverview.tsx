import React from 'react';
import {
  Title,
  Text,
  Stack,
  Grid,
  Paper,
  Badge,
  Group,
  ThemeIcon,
  Anchor,
  Divider,
  Box,
  List,
} from '@mantine/core';
import {
  IconLayoutDashboard,
  IconPuzzle,
  IconSettings,
  IconPlus,
  IconArrowRight,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';

const StepCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <Paper p="md" radius="md" withBorder>
    <Group gap="md" align="flex-start">
      {icon}
      <div>
        <Text fw={600} mb={4}>
          {title}
        </Text>
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      </div>
    </Group>
  </Paper>
);

const ComponentGuideOverview: React.FC = () => {
  return (
    <Stack gap="xl">
      <Box>
        <Title order={1} mb="xs">
          Component Guide
        </Title>
        <Text size="lg" c="dimmed">
          Build custom pages by combining widgets — no coding required.
        </Text>
      </Box>

      <Divider />

      <Stack gap="md">
        <Group gap="sm">
          <ThemeIcon size="lg" variant="light" color="blue">
            <IconLayoutDashboard size={18} />
          </ThemeIcon>
          <Title order={2}>How Pages Work</Title>
        </Group>

        <Text>
          Your workspace is built around a flexible page system. Each page has a{' '}
          <strong>slug</strong> (URL), a <strong>name</strong>, and a <strong>type</strong> that
          controls how it behaves. Pages can be organized into a hierarchy — a parent page can have
          child pages listed beneath it in the navigation.
        </Text>

        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="md" radius="md" withBorder h="100%">
              <Badge color="blue" variant="light" mb="sm">
                Dashboard
              </Badge>
              <Text size="sm" fw={600} mb={4}>
                Dashboard Pages
              </Text>
              <Text size="sm" c="dimmed">
                Top-level hub pages that can contain child pages. Your main home page is a
                dashboard.
              </Text>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="md" radius="md" withBorder h="100%">
              <Badge color="green" variant="light" mb="sm">
                List
              </Badge>
              <Text size="sm" fw={600} mb={4}>
                List Pages
              </Text>
              <Text size="sm" c="dimmed">
                Pages that show a collection or table. Can be children of a dashboard.
              </Text>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="md" radius="md" withBorder h="100%">
              <Badge color="orange" variant="light" mb="sm">
                Detail
              </Badge>
              <Text size="sm" fw={600} mb={4}>
                Detail Pages
              </Text>
              <Text size="sm" c="dimmed">
                Pages for a specific item. These receive a URL parameter that components use to
                filter their data.
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>

      <Divider />

      <Stack gap="md">
        <Group gap="sm">
          <ThemeIcon size="lg" variant="light" color="violet">
            <IconPuzzle size={18} />
          </ThemeIcon>
          <Title order={2}>How Components Work</Title>
        </Group>

        <Text>
          Each page is made up of one or more <strong>components</strong>. A component is a
          self-contained widget that displays data or provides an interface. Components are stacked
          vertically on a page and can each be configured independently.
        </Text>

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <StepCard
              icon={
                <ThemeIcon color="blue" variant="light" size="lg">
                  <IconLayoutDashboard size={18} />
                </ThemeIcon>
              }
              title="Components are configurable"
              description="Each component has its own config options — for example, the Stats Cards widget lets you choose which statistics to display."
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <StepCard
              icon={
                <ThemeIcon color="green" variant="light" size="lg">
                  <IconSettings size={18} />
                </ThemeIcon>
              }
              title="Config is saved automatically"
              description="When a component lets you change settings, those changes are saved to your page config and persist across sessions."
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <StepCard
              icon={
                <ThemeIcon color="orange" variant="light" size="lg">
                  <IconArrowRight size={18} />
                </ThemeIcon>
              }
              title="Some components use page parameters"
              description="Detail pages pass a parameter to their components, which use it to filter data automatically. You don't need to configure this manually."
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <StepCard
              icon={
                <ThemeIcon color="violet" variant="light" size="lg">
                  <IconPlus size={18} />
                </ThemeIcon>
              }
              title="Add components via Page Settings"
              description="Open the gear icon on any page to add, remove, or reorder components. You can also use the Playground below to preview a component before adding it."
            />
          </Grid.Col>
        </Grid>
      </Stack>

      <Divider />

      <Stack gap="md">
        <Group gap="sm">
          <ThemeIcon size="lg" variant="light" color="green">
            <IconSettings size={18} />
          </ThemeIcon>
          <Title order={2}>Managing Your Pages</Title>
        </Group>

        <Text>
          To customize a page, open the <strong>Page Settings</strong> drawer by clicking the gear
          icon in the top-right corner of any page. From there you can:
        </Text>

        <List size="sm" spacing="xs">
          <List.Item>Rename the page</List.Item>
          <List.Item>
            Add, remove, or reorder <strong>child pages</strong> (for dashboard/list pages)
          </List.Item>
          <List.Item>
            Add or remove <strong>components</strong> from the component dropdown
          </List.Item>
        </List>

        <Text size="sm" c="dimmed">
          Required pages cannot be deleted, but their components can still be modified.
        </Text>
      </Stack>

      <Divider />

      <Paper p="xl" radius="md" bg="blue.0" withBorder>
        <Stack align="center" gap="md">
          <Title order={3} ta="center">
            Browse All Components
          </Title>
          <Text ta="center" c="dimmed">
            Explore every available component, see what it does, try different configurations in the
            playground, and add it directly to one of your pages.
          </Text>
          <Anchor component={Link} to="/component-guide/components" size="lg" fw={600}>
            View Component Catalog →
          </Anchor>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default ComponentGuideOverview;
