import React, { useState } from 'react';
import {
  Title,
  Text,
  Stack,
  Paper,
  Badge,
  Group,
  Button,
  Anchor,
  Divider,
  Table,
  Code,
  Tabs,
  Box,
  Alert,
} from '@mantine/core';
import { IconFlask, IconArrowLeft, IconInfoCircle } from '@tabler/icons-react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { getComponentGuide, CATEGORIES, ExampleConfig } from './componentMetadata';

const ConfigTypeLabel: Record<string, string> = {
  boolean: 'boolean',
  string: 'string',
  number: 'number',
  select: 'string (enum)',
  multiselect: 'string[]',
  json: 'object | array',
};

const ExampleConfigPanel: React.FC<{ example: ExampleConfig; active: boolean }> = ({
  example,
  active,
}) => {
  if (!active) return null;
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        {example.description}
      </Text>
      <Code block>{JSON.stringify(example.config, null, 2)}</Code>
    </Stack>
  );
};

const ComponentDetail: React.FC = () => {
  const { componentType } = useParams<{ componentType: string }>();
  const [activeExample, setActiveExample] = useState('0');

  const entry = componentType ? getComponentGuide(componentType) : undefined;

  if (!entry) {
    return <Navigate to="/component-guide/components" replace />;
  }

  const category = CATEGORIES[entry.category];

  return (
    <Stack gap="xl">
      <Group gap="xs">
        <Anchor component={Link} to="/component-guide/components" size="sm" c="dimmed">
          ← Back to Component Catalog
        </Anchor>
      </Group>

      <Box>
        <Group gap="sm" mb="xs">
          <Badge color={category.color} variant="light">
            {category.label}
          </Badge>
          {entry.pageParamsSupported && entry.pageParamsSupported.length > 0 && (
            <Badge color="gray" variant="outline" size="sm">
              page params: {entry.pageParamsSupported.join(', ')}
            </Badge>
          )}
        </Group>
        <Title order={1} mb="xs">
          {entry.displayName}
        </Title>
        <Text size="lg" c="dimmed">
          {entry.description}
        </Text>
      </Box>

      <Button
        component={Link}
        to={`/component-guide/playground/${entry.type}`}
        leftSection={<IconFlask size={18} />}
        size="md"
        style={{ alignSelf: 'flex-start' }}
      >
        Open Playground
      </Button>

      <Divider />

      <Stack gap="sm">
        <Title order={3}>About This Component</Title>
        <Text>{entry.longDescription}</Text>
        {entry.note && (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            {entry.note}
          </Alert>
        )}
      </Stack>

      <Divider />

      <Stack gap="sm">
        <Title order={3}>Configuration Options</Title>
        {entry.configOptions.length === 0 ? (
          <Text c="dimmed" size="sm">
            This component has no configuration options.
          </Text>
        ) : (
          <Table striped withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Key</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Default</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entry.configOptions.map((opt) => (
                <Table.Tr key={opt.key}>
                  <Table.Td>
                    <Code>{opt.key}</Code>
                  </Table.Td>
                  <Table.Td>
                    <Code c="violet">{ConfigTypeLabel[opt.type] ?? opt.type}</Code>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{opt.description}</Text>
                    {opt.options && (
                      <Text size="xs" c="dimmed" mt={4}>
                        Options: {opt.options.map((o) => `"${o.value}"`).join(', ')}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {opt.default !== undefined ? (
                      <Code>{JSON.stringify(opt.default)}</Code>
                    ) : (
                      <Text size="xs" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      <Divider />

      <Stack gap="sm">
        <Title order={3}>Example Configurations</Title>
        <Text size="sm" c="dimmed">
          These are ready-made config presets you can apply in the Playground or copy directly.
        </Text>

        {entry.exampleConfigs.length === 1 ? (
          <Stack gap="sm">
            <Text size="sm" fw={600}>
              {entry.exampleConfigs[0].label}
            </Text>
            <ExampleConfigPanel example={entry.exampleConfigs[0]} active />
          </Stack>
        ) : (
          <Tabs value={activeExample} onChange={(v) => setActiveExample(v ?? '0')}>
            <Tabs.List mb="md">
              {entry.exampleConfigs.map((ex, i) => (
                <Tabs.Tab key={i} value={String(i)}>
                  {ex.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            {entry.exampleConfigs.map((ex, i) => (
              <Tabs.Panel key={i} value={String(i)}>
                <ExampleConfigPanel example={ex} active />
              </Tabs.Panel>
            ))}
          </Tabs>
        )}
      </Stack>

      <Divider />

      <Paper p="xl" radius="md" bg="blue.0" withBorder>
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <div>
            <Text fw={600} mb={4}>
              Ready to try it?
            </Text>
            <Text size="sm" c="dimmed">
              Open the playground to interact with this component using your own data, tweak
              settings in real time, and add it to any of your pages.
            </Text>
          </div>
          <Group gap="xs">
            <Button
              component={Link}
              to="/component-guide/components"
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
            >
              Back to Catalog
            </Button>
            <Button
              component={Link}
              to={`/component-guide/playground/${entry.type}`}
              leftSection={<IconFlask size={16} />}
            >
              Open Playground
            </Button>
          </Group>
        </Group>
      </Paper>
    </Stack>
  );
};

export default ComponentDetail;
