import React, { useState } from 'react';
import { Stack, Group, Text, TextInput, ActionIcon, Checkbox, Paper } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { ComponentProps } from '../ComponentRegistry';

interface BulletItem {
    id: string;
    text: string;
    completed?: boolean;
    on_copy?: string;
}

const TodoBulletListWidget: React.FC<ComponentProps> = ({ config, onConfigChange }) => {
    const label = (config.label as string) ?? 'Goals';
    const items = (config.items as BulletItem[]) ?? [];
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newText, setNewText] = useState('');

    const updateItems = (updated: BulletItem[]) => {
        void onConfigChange({ ...config, items: updated });
    };

    const toggleComplete = (id: string) => {
        updateItems(
            items.map((item) =>
                item.id === id ? { ...item, completed: !item.completed } : item
            )
        );
    };

    const addItem = () => {
        if (!newText.trim()) return;
        const id = `bl-${Date.now()}`;
        updateItems([...items, { id, text: newText.trim(), completed: false, on_copy: 'reset' }]);
        setNewText('');
    };

    const removeItem = (id: string) => {
        updateItems(items.filter((item) => item.id !== id));
    };

    return (
        <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="sm">
                {label}
            </Text>
            <Stack gap="xs">
                {items.map((item) => (
                    <Group key={item.id} gap="xs" wrap="nowrap">
                        <Checkbox
                            checked={item.completed ?? false}
                            onChange={() => toggleComplete(item.id)}
                        />
                        {editingId === item.id ? (
                            <TextInput
                                value={item.text}
                                size="sm"
                                style={{ flex: 1 }}
                                autoFocus
                                onChange={(e) =>
                                    updateItems(
                                        items.map((i) =>
                                            i.id === item.id ? { ...i, text: e.target.value } : i
                                        )
                                    )
                                }
                                onBlur={() => setEditingId(null)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setEditingId(null);
                                }}
                            />
                        ) : (
                            <Text
                                size="sm"
                                style={{
                                    flex: 1,
                                    cursor: 'pointer',
                                    textDecoration: item.completed ? 'line-through' : undefined,
                                    color: item.completed ? 'var(--mantine-color-dimmed)' : undefined,
                                }}
                                onClick={() => setEditingId(item.id)}
                            >
                                {item.text}
                            </Text>
                        )}
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Group>
                ))}
                <Group gap="xs">
                    <TextInput
                        placeholder="Add item..."
                        size="sm"
                        style={{ flex: 1 }}
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') addItem();
                        }}
                    />
                    <ActionIcon variant="light" onClick={addItem}>
                        <IconPlus size={16} />
                    </ActionIcon>
                </Group>
            </Stack>
        </Paper>
    );
};

export default TodoBulletListWidget;
