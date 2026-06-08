import React, { useContext, useState, useCallback } from 'react';
import {
    Text,
    TextInput,
    Stack,
    Group,
    ActionIcon,
    Button,
    Select,
    Badge,
    Divider,
    Modal,
    Box,
} from '@mantine/core';
import {
    IconPlus,
    IconTrash,
    IconGripVertical,
} from '@tabler/icons-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { UserPagesContext } from '../../contexts/UserPagesContext';
import { TodoContext } from '../../contexts/TodoContext';
import { UserPage } from '../../models/user/user-page';
import { getRegisteredTypes } from './ComponentRegistry';

const COMPONENT_LABELS: Record<string, string> = {
    day_summary: 'Day Summary',
    stats_cards: 'Stats Cards',
    settings_panel: 'Settings Panel',
    todo_task: 'Todo Task',
};

interface PageSettingsPanelProps {
    page: UserPage;
}

const PageSettingsPanel: React.FC<PageSettingsPanelProps> = ({ page }) => {
    const { pages, editPage, addPage, removePage, addComponent, removeComponent } =
        useContext(UserPagesContext);
    const { silentRefresh } = useContext(TodoContext);

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [newPageName, setNewPageName] = useState('');
    const [saving, setSaving] = useState(false);
    const [pageName, setPageName] = useState(page.name);

    React.useEffect(() => {
        setPageName(page.name);
    }, [page.name]);

    const childPages = pages
        .filter((p) => p.parent_page_id === page.id)
        .sort((a, b) => a.display_order - b.display_order);

    const canHaveChildren = page.page_type !== 'detail';

    const handleNameSave = useCallback(async () => {
        if (!pageName.trim() || pageName === page.name) return;
        await editPage(page.id!, { name: pageName });
    }, [page.id, page.name, pageName, editPage]);

    const handleDragEnd = useCallback(
        async (result: DropResult) => {
            if (!result.destination) return;
            const sourceIndex = result.source.index;
            const destIndex = result.destination.index;
            if (sourceIndex === destIndex) return;

            const reordered = [...childPages];
            const [moved] = reordered.splice(sourceIndex, 1);
            reordered.splice(destIndex, 0, moved);

            for (let i = 0; i < reordered.length; i++) {
                if (reordered[i].display_order !== i) {
                    await editPage(reordered[i].id!, { display_order: i });
                }
            }
        },
        [childPages, editPage]
    );

    const handleAddPage = async () => {
        if (!newPageName.trim()) return;
        setSaving(true);
        try {
            await addPage({
                name: newPageName,
                page_type: 'list',
                route_path: newPageName.toLowerCase().replace(/\s+/g, '-'),
                is_nav_item: true,
                parent_page_id: page.id,
            });
            setAddModalOpen(false);
            setNewPageName('');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (p: UserPage) => {
        if (p.is_required) return;
        if (window.confirm(`Delete page "${p.name}"? This cannot be undone.`)) {
            await removePage(p.id!);
        }
    };

    const handleAddComponent = async (pageId: number, componentType: string) => {
        if (componentType === 'todo_group') {
            await addComponent(pageId, {
                component_type: 'todo_task',
                config_json: {
                    root: {
                        id: `cat_${Date.now()}`,
                        task_type: 'category',
                        label: 'New Group',
                        schedule: [0, 1, 2, 3, 4, 5, 6],
                        children: [],
                    },
                },
            });
        } else {
            await addComponent(pageId, { component_type: componentType });
        }
        // Refresh the todo page so the new component appears
        await silentRefresh();
    };

    const handleRemoveComponent = async (pageId: number, componentId: number) => {
        await removeComponent(pageId, componentId);
        // Refresh the todo page so the removed component disappears
        await silentRefresh();
    };

    const pageComponents = (page.components ?? []).filter(
        (c) => c.component_type !== 'page_manager'
    );

    return (
        <Stack gap="md">
            <TextInput
                label="Page Name"
                value={pageName}
                onChange={(e) => setPageName(e.currentTarget.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                }}
            />

            {canHaveChildren && (
                <>
                    <Divider />

                    <Group justify="space-between">
                        <Text size="md" fw={600}>
                            Pages
                        </Text>
                        <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconPlus size={14} />}
                            onClick={() => setAddModalOpen(true)}
                        >
                            Add Page
                        </Button>
                    </Group>

                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="pages">
                            {(provided) => (
                                <Stack
                                    gap={4}
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                >
                                    {childPages.map((p, index) => (
                                        <Draggable
                                            key={p.id}
                                            draggableId={String(p.id)}
                                            index={index}
                                        >
                                            {(dragProvided) => (
                                                <Box
                                                    ref={dragProvided.innerRef}
                                                    {...dragProvided.draggableProps}
                                                    style={{
                                                        ...dragProvided.draggableProps.style,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '8px 12px',
                                                        borderRadius: 'var(--polis-radius-sm, var(--mantine-radius-sm))',
                                                        border: '1px solid var(--polis-color-border, var(--mantine-color-gray-2))',
                                                        backgroundColor: 'var(--polis-color-surface, white)',
                                                    }}
                                                >
                                                    <div
                                                        {...dragProvided.dragHandleProps}
                                                        style={{
                                                            cursor: 'grab',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            marginRight: 8,
                                                        }}
                                                    >
                                                        <IconGripVertical
                                                            size={16}
                                                            color="var(--polis-color-text-muted, var(--mantine-color-gray-5))"
                                                        />
                                                    </div>
                                                    <Text size="sm" fw={500} style={{ flex: 1 }}>
                                                        {p.name}
                                                    </Text>
                                                    {!p.is_required && (
                                                        <ActionIcon
                                                            size="sm"
                                                            variant="subtle"
                                                            color="red"
                                                            onClick={() => handleDelete(p)}
                                                        >
                                                            <IconTrash size={14} />
                                                        </ActionIcon>
                                                    )}
                                                </Box>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </Stack>
                            )}
                        </Droppable>
                    </DragDropContext>

                    {childPages.length === 0 && (
                        <Text size="sm" c="dimmed" ta="center" py="sm">
                            No child pages.
                        </Text>
                    )}
                </>
            )}

            <Divider />

            <Text size="md" fw={600}>
                Components
            </Text>
            <Stack gap="xs">
                {pageComponents.length === 0 ? (
                    <Text size="sm" c="dimmed">
                        No components yet.
                    </Text>
                ) : (
                    pageComponents.map((comp) => (
                        <Group key={comp.id} justify="space-between">
                            <Badge variant="light" size="sm" tt="uppercase">
                                {comp.component_type === 'todo_task' && (comp.config_json as any)?.root?.label
                                    ? (comp.config_json as any).root.label
                                    : comp.component_type.replace(/_/g, ' ')}
                            </Badge>
                            <ActionIcon
                                size="sm"
                                color="red"
                                variant="subtle"
                                onClick={() => handleRemoveComponent(page.id!, comp.id!)}
                            >
                                <IconTrash size={14} />
                            </ActionIcon>
                        </Group>
                    ))
                )}
                <Select
                    placeholder="Add component..."
                    size="xs"
                    searchable
                    value={null}
                    data={[
                        { value: 'todo_group', label: 'Todo Group' },
                        ...getRegisteredTypes()
                            .filter((t) => !['page_manager', 'todo', 'todo_bullet_list'].includes(t))
                            .map((t) => ({
                                value: t,
                                label: COMPONENT_LABELS[t] ?? t.replace(/_/g, ' '),
                            })),
                    ]}
                    onChange={(v) => {
                        if (v) void handleAddComponent(page.id!, v);
                    }}
                    clearable
                />
            </Stack>

            <Modal
                opened={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Add Page"
            >
                <Stack>
                    <TextInput
                        label="Page Name"
                        placeholder="My Custom Page"
                        value={newPageName}
                        onChange={(e) => setNewPageName(e.currentTarget.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddPage();
                        }}
                    />
                    <Button
                        onClick={handleAddPage}
                        loading={saving}
                        disabled={!newPageName.trim()}
                    >
                        Create Page
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    );
};

export default PageSettingsPanel;
