import React, { Suspense, useState, useCallback, useContext } from 'react';
import {
    Title,
    Text,
    Stack,
    Paper,
    Group,
    Button,
    Anchor,
    Alert,
    Tabs,
    Loader,
    ActionIcon,
    Tooltip,
    Box,
    Drawer,
} from '@mantine/core';
import {
    IconFlask,
    IconPlus,
    IconInfoCircle,
    IconSettings,
} from '@tabler/icons-react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { getComponentGuide } from './componentMetadata';
import { getComponent } from '../../components/PageRenderer/ComponentRegistry';
import { MeContext } from '../../contexts/MeContext';
import ConfigEditor from './ConfigEditor';
import AddToPageModal from './AddToPageModal';

interface GenericConfigDrawerProps {
    opened: boolean;
    onClose: () => void;
    entry: ReturnType<typeof getComponentGuide>;
    config: Record<string, unknown>;
    onChange: (config: Record<string, unknown>) => void;
}

const GenericConfigDrawer: React.FC<GenericConfigDrawerProps> = ({
    opened,
    onClose,
    entry,
    config,
    onChange,
}) => {
    if (!entry) return null;
    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title={`Configure ${entry.displayName}`}
            position="right"
            size="md"
            styles={{ title: { fontWeight: 600, fontSize: '1.1rem' } }}
        >
            <Stack gap="md">
                <ConfigEditor
                    options={entry.configOptions}
                    config={config}
                    onChange={onChange}
                />
            </Stack>
        </Drawer>
    );
};

const ComponentPlayground: React.FC = () => {
    const { componentType } = useParams<{ componentType: string }>();
    const { me, isLoggedIn } = useContext(MeContext);

    const entry = componentType ? getComponentGuide(componentType) : undefined;
    const Component = componentType ? getComponent(componentType) : null;

    const [tabConfigs, setTabConfigs] = useState<Record<string, Record<string, unknown>>>(() => {
        if (!entry) return {};
        return Object.fromEntries(
            entry.exampleConfigs.map((ex, i) => [String(i), ex.config])
        );
    });
    const [activeTab, setActiveTab] = useState('0');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [pageParams] = useState<Record<string, string>>({});
    const [addModalOpen, setAddModalOpen] = useState(false);

    const currentConfig = tabConfigs[activeTab] ?? {};

    const handleConfigChange = useCallback(
        async (newConfig: Record<string, unknown>) => {
            setTabConfigs((prev) => ({ ...prev, [activeTab]: newConfig }));
        },
        [activeTab]
    );

    const handleTabChange = useCallback((value: string | null) => {
        if (value != null) setActiveTab(value);
    }, []);

    if (!entry || !Component) {
        return <Navigate to="/component-guide/components" replace />;
    }

    const hasDrawer = entry.configOptions.length > 0;

    return (
        <Stack gap="xl">
            <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                <Box>
                    <Group gap="xs" mb={4}>
                        <Anchor
                            component={Link}
                            to="/component-guide/components"
                            size="sm"
                            c="dimmed"
                        >
                            ← Component Catalog
                        </Anchor>
                    </Group>
                    <Group gap="sm" align="center">
                        <IconFlask size={24} />
                        <Title order={2}>{entry.displayName}</Title>
                    </Group>
                    <Text size="sm" c="dimmed" mt={4}>
                        {entry.description}
                    </Text>
                </Box>

                <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setAddModalOpen(true)}
                    disabled={!isLoggedIn}
                >
                    Add to Page
                </Button>
            </Group>

            {!isLoggedIn && (
                <Alert icon={<IconInfoCircle size={16} />} color="blue">
                    Sign in to render live component previews and add components to your pages.
                </Alert>
            )}

            <Tabs value={activeTab} onChange={handleTabChange}>
                <Tabs.List>
                    {entry.exampleConfigs.map((ex, i) => (
                        <Tabs.Tab key={i} value={String(i)}>
                            {ex.label}
                        </Tabs.Tab>
                    ))}
                </Tabs.List>

                {entry.exampleConfigs.map((ex, i) => (
                    <Tabs.Panel key={i} value={String(i)} pt="md">
                        <Stack gap="md">
                            <Text size="sm" c="dimmed">
                                {ex.description}
                            </Text>

                            <Paper p="lg" radius="md" withBorder>
                                {hasDrawer && (
                                    <Group justify="flex-end" mb="md">
                                        <Tooltip label="Configure" position="left">
                                            <ActionIcon
                                                variant="subtle"
                                                color="gray"
                                                onClick={() => setDrawerOpen(true)}
                                            >
                                                <IconSettings size={16} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </Group>
                                )}

                                {isLoggedIn && me?.id ? (
                                    <Suspense fallback={<Loader size="sm" />}>
                                        <Component
                                            key={activeTab}
                                            componentId={-1}
                                            config={currentConfig}
                                            onConfigChange={handleConfigChange}
                                            onDisplayUpdate={() => {}}
                                            userId={me.id}
                                            pageParams={pageParams}
                                        />
                                    </Suspense>
                                ) : (
                                    <Alert
                                        color="gray"
                                        icon={<IconInfoCircle size={16} />}
                                    >
                                        Sign in to see a live preview of this component
                                        with your data.
                                    </Alert>
                                )}
                            </Paper>

                            <Group justify="flex-end">
                                <Button
                                    leftSection={<IconPlus size={16} />}
                                    size="sm"
                                    variant="light"
                                    onClick={() => setAddModalOpen(true)}
                                    disabled={!isLoggedIn}
                                >
                                    Add to Page with This Config
                                </Button>
                            </Group>
                        </Stack>
                    </Tabs.Panel>
                ))}
            </Tabs>

            {entry.configOptions.length > 0 && (
                <GenericConfigDrawer
                    opened={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    entry={entry}
                    config={currentConfig}
                    onChange={handleConfigChange}
                />
            )}

            {isLoggedIn && (
                <AddToPageModal
                    opened={addModalOpen}
                    onClose={() => setAddModalOpen(false)}
                    componentType={entry.type}
                    componentDisplayName={entry.displayName}
                    config={currentConfig}
                />
            )}
        </Stack>
    );
};

export default ComponentPlayground;
