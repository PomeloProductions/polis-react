import React, { useContext, useState, useCallback } from 'react';
import { Stack, Group, Select, ActionIcon } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { ComponentProps } from '../ComponentRegistry';
import TodoTaskNodeRenderer from '../../Todo/TodoTaskNodeRenderer';
import {
  TodoTaskNode,
  updateNodeAtPath,
  removeNodeAtPath,
  getNodeAtPath,
  createEmptyNode,
} from '../../Todo/todoTaskUtils';
import { patchTodoNode } from '../../../services/requests/TodoRequests';
import { MeContext } from '../../../contexts/MeContext';
import { TodoContext } from '../../../contexts/TodoContext';

const TodoTaskWidget: React.FC<ComponentProps> = ({
  componentId,
  config,
  onConfigChange,
  onDisplayUpdate,
}) => {
  const rootNode = (config.root as TodoTaskNode) ?? null;
  const [addType, setAddType] = useState<string | null>(null);
  const { me } = useContext(MeContext);
  const { refreshBalances, silentRefresh } = useContext(TodoContext);

  const handleUpdate = useCallback(
    (path: number[], patch: Partial<TodoTaskNode>) => {
      if (!rootNode || !me?.id) return;

      // Resolve the target node's client_id BEFORE optimistic update
      const targetNode = path.length === 0 ? rootNode : getNodeAtPath(rootNode, path);
      if (!targetNode?.id) return;

      // Optimistic display update — no config_json PUT
      const updated = updateNodeAtPath(rootNode, path, patch);
      onDisplayUpdate({ ...config, root: updated });

      // PATCH directly to the relational tables
      patchTodoNode(me.id, targetNode.id, componentId, patch as Record<string, unknown>)
        .then(() => {
          // Refresh balances after balance-affecting changes
          if ('_manual_balance_edit' in patch || 'tally' in patch) {
            void refreshBalances();
          }
          // Only do a full page refresh for manual balance edits (not mark-done/groups)
          if ('_manual_balance_edit' in patch) {
            void silentRefresh();
          }
        })
        .catch((e) => {
          console.error('Failed to patch node', e);
        });
    },
    [rootNode, config, onDisplayUpdate, me?.id, componentId, refreshBalances, silentRefresh],
  );

  const handleRemove = useCallback(
    (path: number[]) => {
      if (!rootNode || path.length === 0) return;
      const updated = removeNodeAtPath(rootNode, path);
      onDisplayUpdate({ ...config, root: updated });
    },
    [rootNode, config, onDisplayUpdate],
  );

  const createRoot = () => {
    if (!addType) return;
    const node = createEmptyNode(addType as 'category' | 'rotating' | 'line_item', 'Todo');
    void onConfigChange({ ...config, root: node });
    setAddType(null);
  };

  if (!rootNode) {
    return (
      <Group gap="xs" p="md">
        <Select
          placeholder="Create root node..."
          size="sm"
          data={[
            { value: 'category', label: 'Category (container)' },
            { value: 'rotating', label: 'Rotating (priority groups)' },
            { value: 'line_item', label: 'Line Item (simple task)' },
          ]}
          value={addType}
          onChange={setAddType}
          style={{ flex: 1, maxWidth: 250 }}
        />
        <ActionIcon variant="light" size="lg" onClick={createRoot} disabled={!addType}>
          <IconPlus size={16} />
        </ActionIcon>
      </Group>
    );
  }

  return (
    <Stack gap="xs">
      <TodoTaskNodeRenderer
        node={rootNode}
        path={[]}
        componentId={componentId}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
      />
    </Stack>
  );
};

export default TodoTaskWidget;
