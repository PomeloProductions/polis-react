import React, { Suspense, useCallback, useContext, useEffect, useState } from 'react';
import {
  Title,
  Text,
  Stack,
  Paper,
  Group,
  Button,
  TextInput,
  Collapse,
  Box,
  Divider,
  Loader,
  Alert,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconSearch,
  IconFlask,
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
  IconSettings,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { COMPONENT_GUIDE, ComponentGuideEntry } from './componentMetadata';
import { getComponent } from '../../components/PageRenderer/ComponentRegistry';
import { MeContext } from '../../contexts/MeContext';

interface ComponentRowProps {
  entry: ComponentGuideEntry;
  isExpanded: boolean;
  onToggle: () => void;
  userId: number | null;
}

const ComponentRow: React.FC<ComponentRowProps> = ({ entry, isExpanded, onToggle, userId }) => {
  const Component = getComponent(entry.type);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (isExpanded && !mounted) setMounted(true);
  }, [isExpanded]); // eslint-disable-line react-hooks/exhaustive-deps

  const previewConfig =
    entry.exampleConfigs.length > 0
      ? entry.exampleConfigs[0].config
      : entry.configOptions.reduce<Record<string, unknown>>((acc, opt) => {
          if (opt.default !== undefined) acc[opt.key] = opt.default;
          return acc;
        }, {});

  return (
    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
      <Group
        px="lg"
        py="md"
        justify="space-between"
        align="center"
        wrap="nowrap"
        style={{ cursor: 'pointer' }}
        onClick={onToggle}
      >
        <Group gap="md" align="center" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <Text fw={700} size="md" truncate>
              {entry.displayName}
            </Text>
            <Text size="sm" c="dimmed" lineClamp={1}>
              {entry.description}
            </Text>
          </div>
        </Group>

        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Button
            component={Link}
            to={`/component-guide/playground/${entry.type}`}
            size="xs"
            variant="subtle"
            leftSection={<IconFlask size={14} />}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            Playground
          </Button>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-label={isExpanded ? 'Collapse' : 'See more'}
          >
            {isExpanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
          </ActionIcon>
        </Group>
      </Group>

      <Collapse in={isExpanded}>
        <Divider />
        <Box p="lg" bg="gray.0">
          <Text size="sm" c="dimmed" mb="lg">
            {entry.longDescription}
          </Text>

          {!userId || !Component ? (
            <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light">
              Sign in to see a live preview of this component with your data.{' '}
              <Link to="/sign-in">Sign in →</Link>
            </Alert>
          ) : (
            <Paper p="lg" radius="md" withBorder bg="white">
              {entry.configOptions.length > 0 && (
                <Group justify="flex-end" mb={4}>
                  <Tooltip label="Open in Playground" position="left">
                    <ActionIcon
                      component={Link}
                      to={`/component-guide/playground/${entry.type}`}
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <IconSettings size={15} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )}
              {mounted && Component ? (
                <Suspense fallback={<Loader size="sm" />}>
                  <Component
                    componentId={0}
                    config={previewConfig}
                    onConfigChange={async () => {}}
                    onDisplayUpdate={() => {}}
                    userId={userId}
                  />
                </Suspense>
              ) : (
                <Loader size="sm" />
              )}
            </Paper>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              component={Link}
              to={`/component-guide/playground/${entry.type}`}
              size="sm"
              leftSection={<IconFlask size={14} />}
            >
              Open Playground
            </Button>
          </Group>
        </Box>
      </Collapse>
    </Paper>
  );
};

const ComponentsIndex: React.FC = () => {
  const { me, isLoggedIn } = useContext(MeContext);
  const [search, setSearch] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const filtered = COMPONENT_GUIDE.filter((entry) => {
    return (
      search.length === 0 ||
      entry.displayName.toLowerCase().includes(search.toLowerCase()) ||
      entry.description.toLowerCase().includes(search.toLowerCase())
    );
  });

  const userId = isLoggedIn && me?.id ? me.id : null;

  return (
    <Stack gap="xl">
      <Box>
        <Title order={1} mb="xs">
          Component Catalog
        </Title>
        <Text c="dimmed">
          {COMPONENT_GUIDE.length} components available. Click any row or the arrow to see a live
          preview.
        </Text>
      </Box>

      <TextInput
        placeholder="Search components..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        size="md"
      />

      {filtered.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No components match your search.
        </Text>
      ) : (
        <Stack gap="sm">
          {filtered.map((entry) => (
            <ComponentRow
              key={entry.type}
              entry={entry}
              isExpanded={expandedTypes.has(entry.type)}
              onToggle={() => handleToggle(entry.type)}
              userId={userId}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export default ComponentsIndex;
