import React, { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  ActionIcon,
  Drawer,
  Divider,
  Chip,
  Switch,
  Badge,
  Collapse,
  SimpleGrid,
  UnstyledButton,
} from '@mantine/core';
import { IconPlus, IconTrash, IconGripVertical } from '@tabler/icons-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  TodoTaskNode,
  SubItem,
  makeId,
  createEmptyNode,
  distributeIntoGroups,
} from './todoTaskUtils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WORKDAYS = [1, 2, 3, 4, 5];

interface TodoTaskSettingsDrawerProps {
  node: TodoTaskNode;
  opened: boolean;
  onClose: () => void;
  onUpdate: (patch: Partial<TodoTaskNode>) => void;
  onRemove?: () => void;
}

const TodoTaskSettingsDrawer: React.FC<TodoTaskSettingsDrawerProps> = ({
  node,
  opened,
  onClose,
  onUpdate,
  onRemove,
}) => {
  const schedule = node.schedule ?? ALL_DAYS;
  const groups = node.groups ?? [];
  const customGroups = node.custom_groups ?? false;
  const allItems = groups.flatMap((g) => g.children);
  const defaultLabel = groups[0]?.label ?? 'Priority';

  const [newItemText, setNewItemText] = useState('');
  const [newSubItemText, setNewSubItemText] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // For categories, propagate schedule changes to all descendants
  const updateSchedule = (next: number[]) => {
    if (node.task_type === 'category' && node.children) {
      const propagate = (children: TodoTaskNode[]): TodoTaskNode[] =>
        children.map((child) => ({
          ...child,
          schedule: next,
          ...(child.children ? { children: propagate(child.children) } : {}),
        }));
      onUpdate({ schedule: next, children: propagate(node.children) });
    } else {
      onUpdate({ schedule: next });
    }
  };

  const changeNumGroups = (n: number) => {
    if (n < 1) return;
    if (customGroups) {
      const newGroups = [...groups];
      while (newGroups.length < n) {
        newGroups.push({
          group_number: newGroups.length + 1,
          label: defaultLabel,
          count_this_group: 0,
          on_copy: 'preserve',
          children: [],
        });
      }
      if (n < newGroups.length) {
        const orphans = newGroups.slice(n).flatMap((g) => g.children);
        const trimmed = newGroups.slice(0, n);
        if (orphans.length > 0 && trimmed.length > 0) {
          trimmed[trimmed.length - 1] = {
            ...trimmed[trimmed.length - 1],
            children: [...trimmed[trimmed.length - 1].children, ...orphans],
          };
        }
        onUpdate({ groups: trimmed });
        return;
      }
      onUpdate({ groups: newGroups });
    } else {
      onUpdate({ groups: distributeIntoGroups(allItems, n, groups, defaultLabel) });
    }
  };

  // Item management is now inline per-group in the settings UI

  // Sub-items management for line_item
  const subItems = node.sub_items ?? [];

  const addSubItem = () => {
    if (!newSubItemText.trim()) return;
    const sub: SubItem = { id: makeId('si'), text: newSubItemText.trim() };
    onUpdate({ sub_items: [...subItems, sub] });
    setNewSubItemText('');
  };

  const removeSubItem = (subId: string) => {
    onUpdate({ sub_items: subItems.filter((s) => s.id !== subId) });
  };

  const editSubItemText = (subId: string, text: string) => {
    onUpdate({ sub_items: subItems.map((s) => (s.id === subId ? { ...s, text } : s)) });
  };

  // Children management for category
  const addChild = (taskType: 'category' | 'rotating' | 'line_item') => {
    const child = createEmptyNode(taskType, 'New Task');
    onUpdate({ children: [...(node.children ?? []), child] });
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={`${node.label} — ${node.task_type === 'category' ? 'Todo Group' : node.task_type === 'rotating' ? 'Rotating' : 'Line Item'}`}
      position="right"
      size="md"
    >
      <Stack gap="md" pb={120}>
        {/* Common fields */}
        <TextInput
          label="Label"
          value={node.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
        />
        <Textarea
          label="Description"
          value={node.description ?? ''}
          onChange={(e) => onUpdate({ description: e.target.value || undefined })}
          autosize
          minRows={2}
        />
        <Select
          label="Task type"
          description="Changing type may lose type-specific data"
          value={node.task_type}
          data={[
            { value: 'category', label: 'Todo Group (container)' },
            { value: 'rotating', label: 'Rotating (priority groups)' },
            { value: 'line_item', label: 'Line Item (simple task)' },
          ]}
          onChange={(val) => {
            if (val && val !== node.task_type) {
              const patch: Partial<TodoTaskNode> = { task_type: val as TodoTaskNode['task_type'] };
              if (val === 'rotating' && !node.groups) {
                patch.groups = [
                  {
                    group_number: 1,
                    label: 'Priority',
                    count_this_group: 0,
                    on_copy: 'preserve',
                    children: [],
                  },
                  {
                    group_number: 2,
                    label: 'Priority',
                    count_this_group: 0,
                    on_copy: 'preserve',
                    children: [],
                  },
                ];
                patch.tally = 0;
                patch.custom_groups = false;
              }
              if (val === 'line_item') {
                patch.completed = false;
                if (!node.sub_items) patch.sub_items = [];
              }
              if (val === 'category') {
                if (!node.children) patch.children = [];
              }
              onUpdate(patch);
            }
          }}
        />

        <Divider label="Schedule" labelPosition="left" />
        <Group gap={4} wrap="wrap">
          {DAY_LABELS.map((dayLabel, dayNum) => (
            <Chip
              key={dayNum}
              checked={schedule.includes(dayNum)}
              onChange={() => {
                const next = schedule.includes(dayNum)
                  ? schedule.filter((d) => d !== dayNum)
                  : [...schedule, dayNum].sort((a, b) => a - b);
                updateSchedule(next);
              }}
              size="xs"
            >
              {dayLabel}
            </Chip>
          ))}
          <ActionIcon
            variant="light"
            size="xs"
            onClick={() => updateSchedule(ALL_DAYS)}
            title="Select all"
          >
            <Text size="xs">All</Text>
          </ActionIcon>
          <ActionIcon
            variant="light"
            size="xs"
            onClick={() => updateSchedule(WORKDAYS)}
            title="Weekdays only"
          >
            <Text size="xs">M-F</Text>
          </ActionIcon>
        </Group>

        {/* Tracking mode — available for all node types */}
        <Select
          label="Tracking mode"
          description="Units: tally counts tasks, each with a time budget. Hours: tally is a running hour balance."
          value={node.tracking_mode ?? 'hours'}
          data={[
            { value: 'units', label: 'Units' },
            { value: 'hours', label: 'Hours' },
          ]}
          onChange={(val) => onUpdate({ tracking_mode: (val as 'units' | 'hours') ?? 'hours' })}
        />
        {(node.tracking_mode ?? 'hours') === 'hours' ? (
          <NumberInput
            label="Hours per day"
            description="Hours added to balance each scheduled day"
            value={node.tally_step ?? 0}
            min={0}
            step={0.25}
            decimalScale={2}
            w={160}
            onChange={(val) => onUpdate({ tally_step: typeof val === 'number' ? val : 0 })}
          />
        ) : (
          <SimpleGrid cols={2} spacing="xs">
            <NumberInput
              label="Units per day"
              value={node.tally_step ?? 0}
              min={0}
              step={0.5}
              decimalScale={1}
              onChange={(val) => onUpdate({ tally_step: typeof val === 'number' ? val : 0 })}
            />
            <NumberInput
              label="Hours per unit"
              value={node.time_budget_hours ?? 0}
              min={0}
              step={0.25}
              decimalScale={2}
              onChange={(val) => onUpdate({ time_budget_hours: typeof val === 'number' ? val : 0 })}
            />
          </SimpleGrid>
        )}

        {/* Rotating-specific settings */}
        {node.task_type === 'rotating' && (
          <>
            <Divider label="Priority Groups" labelPosition="left" />
            <NumberInput
              label="Number of groups"
              value={groups.length}
              min={1}
              max={20}
              onChange={(val) => {
                if (typeof val === 'number') changeNumGroups(val);
              }}
            />
            {/* Each group: label + children as editable tasks with drag-drop */}
            <DragDropContext
              onDragEnd={(result: DropResult) => {
                if (!result.destination) return;
                const srcId = result.source.droppableId;
                const dstId = result.destination.droppableId;
                const srcGrpIdx = groups.findIndex((g) => `grp-${g.group_number}` === srcId);
                const dstGrpIdx = groups.findIndex((g) => `grp-${g.group_number}` === dstId);
                if (srcGrpIdx < 0 || dstGrpIdx < 0) return;
                const from = result.source.index;
                const to = result.destination.index;
                if (srcGrpIdx === dstGrpIdx && from === to) return;

                const newGroups = groups.map((g, gi) => {
                  if (gi === srcGrpIdx && gi === dstGrpIdx) {
                    const items = [...g.children];
                    const [moved] = items.splice(from, 1);
                    items.splice(to, 0, moved);
                    return { ...g, children: items };
                  }
                  if (gi === srcGrpIdx) {
                    return { ...g, children: g.children.filter((_, i) => i !== from) };
                  }
                  if (gi === dstGrpIdx) {
                    const movedItem = groups[srcGrpIdx].children[from];
                    const items = [...g.children];
                    items.splice(to, 0, movedItem);
                    return { ...g, children: items };
                  }
                  return g;
                });
                onUpdate({ groups: newGroups });
              }}
            >
              {groups.map((group, groupIdx) => (
                <Stack
                  gap="xs"
                  key={group.group_number}
                  style={{
                    borderLeft: '3px solid var(--polis-color-primary, var(--mantine-color-blue-2))',
                    paddingLeft: 12,
                  }}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Badge size="sm" variant="light">
                      #{group.group_number}
                    </Badge>
                    <TextInput
                      value={group.label ?? ''}
                      size="xs"
                      style={{ flex: 1 }}
                      placeholder={`Group #${group.group_number} label`}
                      onChange={(e) => {
                        onUpdate({
                          groups: groups.map((g, i) =>
                            i === groupIdx ? { ...g, label: e.target.value } : g,
                          ),
                        });
                      }}
                    />
                    {groups.length > 1 && (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="xs"
                        onClick={() => {
                          const remaining = groups
                            .filter((_, i) => i !== groupIdx)
                            .map((g, i) => ({ ...g, group_number: i + 1 }));
                          onUpdate({ groups: remaining });
                        }}
                        title="Remove group"
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    )}
                  </Group>
                  <Droppable droppableId={`grp-${group.group_number}`}>
                    {(provided) => (
                      <Stack
                        gap="xs"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        pl="sm"
                        style={{ minHeight: 4 }}
                      >
                        {group.children.map((child, childIdx) => (
                          <Draggable
                            key={child.id}
                            draggableId={`settings-${child.id}`}
                            index={childIdx}
                          >
                            {(dragProvided) => (
                              <Group
                                gap="xs"
                                wrap="nowrap"
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                              >
                                <div {...dragProvided.dragHandleProps} style={{ cursor: 'grab' }}>
                                  <IconGripVertical
                                    size={14}
                                    color="var(--polis-color-text-muted, var(--mantine-color-gray-5))"
                                  />
                                </div>
                                <TextInput
                                  value={child.label}
                                  size="xs"
                                  style={{ flex: 1 }}
                                  onChange={(e) => {
                                    const newGroups = groups.map((g, gi) =>
                                      gi === groupIdx
                                        ? {
                                            ...g,
                                            children: g.children.map((c, ci) =>
                                              ci === childIdx ? { ...c, label: e.target.value } : c,
                                            ),
                                          }
                                        : g,
                                    );
                                    onUpdate({ groups: newGroups });
                                  }}
                                />
                                <Select
                                  size="xs"
                                  w={100}
                                  value={child.task_type}
                                  data={[
                                    { value: 'line_item', label: 'Task' },
                                    { value: 'rotating', label: 'Priority' },
                                    { value: 'category', label: 'Group' },
                                  ]}
                                  onChange={(val) => {
                                    if (!val) return;
                                    const patch: Partial<TodoTaskNode> = {
                                      task_type: val as TodoTaskNode['task_type'],
                                    };
                                    if (val === 'rotating' && !child.groups) {
                                      patch.groups = [
                                        {
                                          group_number: 1,
                                          label: 'Priority',
                                          count_this_group: 0,
                                          on_copy: 'preserve',
                                          children: [],
                                        },
                                        {
                                          group_number: 2,
                                          label: 'Priority',
                                          count_this_group: 0,
                                          on_copy: 'preserve',
                                          children: [],
                                        },
                                      ];
                                    }
                                    const newGroups = groups.map((g, gi) =>
                                      gi === groupIdx
                                        ? {
                                            ...g,
                                            children: g.children.map((c, ci) =>
                                              ci === childIdx ? { ...c, ...patch } : c,
                                            ),
                                          }
                                        : g,
                                    );
                                    onUpdate({ groups: newGroups });
                                  }}
                                />
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="xs"
                                  onClick={() => {
                                    const newGroups = groups.map((g, gi) =>
                                      gi === groupIdx
                                        ? {
                                            ...g,
                                            children: g.children.filter((_, i) => i !== childIdx),
                                          }
                                        : g,
                                    );
                                    onUpdate({ groups: newGroups });
                                  }}
                                >
                                  <IconTrash size={12} />
                                </ActionIcon>
                              </Group>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </Stack>
                    )}
                  </Droppable>
                  <Group gap="xs" pl="sm">
                    <TextInput
                      placeholder="Add task..."
                      size="xs"
                      style={{ flex: 1 }}
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newItemText.trim()) {
                          const child: TodoTaskNode = {
                            id: makeId('ri'),
                            task_type: 'line_item',
                            label: newItemText.trim(),
                            on_copy: 'preserve',
                          };
                          const newGroups = groups.map((g, gi) =>
                            gi === groupIdx ? { ...g, children: [...g.children, child] } : g,
                          );
                          onUpdate({ groups: newGroups });
                          setNewItemText('');
                        }
                      }}
                    />
                    <ActionIcon
                      variant="light"
                      size="xs"
                      onClick={() => {
                        if (!newItemText.trim()) return;
                        const child: TodoTaskNode = {
                          id: makeId('ri'),
                          task_type: 'line_item',
                          label: newItemText.trim(),
                          on_copy: 'preserve',
                        };
                        const newGroups = groups.map((g, gi) =>
                          gi === groupIdx ? { ...g, children: [...g.children, child] } : g,
                        );
                        onUpdate({ groups: newGroups });
                        setNewItemText('');
                      }}
                    >
                      <IconPlus size={12} />
                    </ActionIcon>
                  </Group>
                </Stack>
              ))}
            </DragDropContext>
          </>
        )}

        {/* Line item sub-items */}
        {node.task_type === 'line_item' && (
          <>
            <Divider label="Sub-items" labelPosition="left" />
            <Stack gap="xs">
              {subItems.map((sub) => (
                <Group key={sub.id} gap="xs" wrap="nowrap">
                  <TextInput
                    value={sub.text}
                    size="xs"
                    style={{ flex: 1 }}
                    onChange={(e) => editSubItemText(sub.id, e.target.value)}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => removeSubItem(sub.id)}
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                </Group>
              ))}
              <Group gap="xs">
                <TextInput
                  placeholder="Add sub-item..."
                  size="xs"
                  style={{ flex: 1 }}
                  value={newSubItemText}
                  onChange={(e) => setNewSubItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addSubItem();
                  }}
                />
                <ActionIcon variant="light" size="xs" onClick={addSubItem}>
                  <IconPlus size={12} />
                </ActionIcon>
              </Group>
            </Stack>
          </>
        )}

        {/* Category children management */}
        {node.task_type === 'category' && (
          <>
            <Divider label="Children" labelPosition="left" />
            {(node.children ?? []).length > 0 ? (
              <DragDropContext
                onDragEnd={(result: DropResult) => {
                  if (!result.destination) return;
                  const from = result.source.index;
                  const to = result.destination.index;
                  if (from === to) return;
                  const children = [...(node.children ?? [])];
                  const [moved] = children.splice(from, 1);
                  children.splice(to, 0, moved);
                  onUpdate({ children });
                }}
              >
                <Droppable droppableId="category-children">
                  {(provided) => (
                    <Stack gap="xs" ref={provided.innerRef} {...provided.droppableProps}>
                      {(node.children ?? []).map((child, idx) => (
                        <Draggable key={child.id} draggableId={`child-${child.id}`} index={idx}>
                          {(dragProvided) => (
                            <Group
                              gap="xs"
                              wrap="nowrap"
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                            >
                              <div {...dragProvided.dragHandleProps} style={{ cursor: 'grab' }}>
                                <IconGripVertical
                                  size={14}
                                  color="var(--polis-color-text-muted, var(--mantine-color-gray-5))"
                                />
                              </div>
                              <Badge
                                size="xs"
                                variant="light"
                                color={
                                  child.task_type === 'category'
                                    ? 'blue'
                                    : child.task_type === 'rotating'
                                      ? 'violet'
                                      : 'gray'
                                }
                              >
                                {child.task_type === 'category'
                                  ? 'Group'
                                  : child.task_type === 'rotating'
                                    ? 'Rotating'
                                    : 'Item'}
                              </Badge>
                              <TextInput
                                value={child.label}
                                size="xs"
                                style={{ flex: 1 }}
                                onChange={(e) => {
                                  const children = (node.children ?? []).map((c, i) =>
                                    i === idx ? { ...c, label: e.target.value } : c,
                                  );
                                  onUpdate({ children });
                                }}
                              />
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="xs"
                                onClick={() => {
                                  const children = (node.children ?? []).filter(
                                    (_, i) => i !== idx,
                                  );
                                  onUpdate({ children });
                                }}
                              >
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Stack>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <Text size="xs" c="dimmed">
                No children yet.
              </Text>
            )}
            <Group gap="xs">
              <Select
                placeholder="Add child..."
                size="xs"
                data={[
                  { value: 'category', label: 'Todo Group' },
                  { value: 'rotating', label: 'Rotating' },
                  { value: 'line_item', label: 'Line Item' },
                ]}
                onChange={(val) => {
                  if (val) addChild(val as 'category' | 'rotating' | 'line_item');
                }}
                value={null}
                style={{ flex: 1 }}
              />
            </Group>
          </>
        )}

        {/* Advanced settings */}
        <UnstyledButton onClick={() => setAdvancedOpen(!advancedOpen)}>
          <Text size="sm" fw={500} c="dimmed">
            {advancedOpen ? '▾' : '▸'} Advanced
          </Text>
        </UnstyledButton>
        <Collapse in={advancedOpen}>
          <Stack gap="sm" pl="xs">
            {node.task_type === 'rotating' && (
              <NumberInput
                label="Cascade ratio"
                description="Items done per tier before focus moves to next"
                value={node.cascade_ratio ?? 2}
                min={1}
                max={10}
                size="xs"
                onChange={(val) => {
                  if (typeof val === 'number') onUpdate({ cascade_ratio: val });
                }}
              />
            )}
            <Switch
              label="Decrement tally on done"
              description="When off, marking done won't reduce the tally count"
              size="xs"
              checked={node.decrement_on_done !== false}
              onChange={(e) => onUpdate({ decrement_on_done: e.currentTarget.checked })}
            />
          </Stack>
        </Collapse>

        {/* Remove node */}
        {onRemove && (
          <>
            <Divider />
            <ActionIcon
              variant="light"
              color="red"
              size="lg"
              onClick={onRemove}
              title="Remove this node"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </>
        )}
      </Stack>
    </Drawer>
  );
};

export default TodoTaskSettingsDrawer;
