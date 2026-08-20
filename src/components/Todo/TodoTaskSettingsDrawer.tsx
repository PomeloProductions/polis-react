import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
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
  Modal,
  Button,
} from '@mantine/core';
import { IconPlus, IconTrash, IconGripVertical } from '@tabler/icons-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MeContext } from '../../contexts/MeContext';
import { getCalendars, TodoCalendar } from '../../services/requests/TodoRequests';
import {
  TodoTaskNode,
  SubItem,
  makeId,
  createEmptyNode,
  formatHoursHHMM,
  parseHHMM,
  normalizeSlotCycle,
  getTrackingMode,
  DEFAULT_TRACKING_MODE,
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
  node: sourceNode,
  opened,
  onClose,
  onUpdate: commitUpdate,
  onRemove,
}) => {
  // Edits accumulate on a LOCAL draft and commit as one patch when the drawer closes.
  // Propagating each keystroke re-rendered the entire page tree behind the drawer, which
  // made the whole site crawl while typing. `node` below aliases the draft so every
  // existing read keeps working; `onUpdate` merges into the draft instead of the tree.
  const [draft, setDraft] = useState<TodoTaskNode>(sourceNode);
  const pendingRef = useRef<Partial<TodoTaskNode>>({});
  const node = draft;

  // Re-seed only when the drawer opens — not on background tree updates mid-edit.
  useEffect(() => {
    if (opened) {
      setDraft(sourceNode);
      pendingRef.current = {};
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, sourceNode.id]);

  const onUpdate = useCallback(
    (patch: Partial<TodoTaskNode>) => {
      if (!opened) {
        // The allotment modal can confirm after the drawer closed — commit directly.
        commitUpdate(patch);
        return;
      }
      pendingRef.current = { ...pendingRef.current, ...patch };
      setDraft((prev) => ({ ...prev, ...patch }));
    },
    [opened, commitUpdate],
  );

  const handleClose = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = {};
    if (Object.keys(pending).length > 0) {
      commitUpdate(pending);
    }
    onClose();
  }, [commitUpdate, onClose]);

  const schedule = node.schedule ?? ALL_DAYS;
  // Rotating slots are the node's direct children (priority_group / bare task / nested rotating)
  const slots = node.children ?? [];

  const [newSubItemText, setNewSubItemText] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Pending "hours per day" change awaiting the user's today/tomorrow choice.
  const [allotmentChange, setAllotmentChange] = useState<{ value: number } | null>(null);
  const [calendars, setCalendars] = useState<TodoCalendar[]>([]);
  const [showCustomSchedule, setShowCustomSchedule] = useState(false);
  const { me } = useContext(MeContext);

  useEffect(() => {
    if (me?.id && opened) {
      getCalendars(me.id)
        .then((res) => setCalendars(res.data.data))
        .catch(() => {});
    }
  }, [me?.id, opened]);

  // When the drawer opens (or switches to a different node), derive the chip-visibility
  // from actual state: chips show when there's no calendar and not all 7 days.
  // After that, the toggle is controlled by the Select's onChange — don't fight the user.
  useEffect(() => {
    if (!opened) return;
    const hasCalendar = !!(node.calendar_rules && node.calendar_rules.length > 0);
    const isAllDays = schedule.length === 7;
    setShowCustomSchedule(!hasCalendar && !isAllDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, node.id]);

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

  // Slot add/remove — the slot COUNT changes, so counts are positions in the OLD quota
  // structure: normalize under the new one (completed cycles play out, mid-cycle progress
  // is preserved).
  const addSlot = (taskType: 'priority_group' | 'line_item' | 'rotating') => {
    const created = createEmptyNode(
      taskType,
      taskType === 'priority_group' ? 'Priority' : 'New Task',
    );
    if (taskType === 'line_item') {
      created.count_this_group = 0;
      created.show_checkmark = true;
      created.on_copy = 'preserve';
    }
    onUpdate({ children: normalizeSlotCycle([...slots, created], node.cascade_ratio ?? 2) });
  };

  const removeSlot = (slotId: string) => {
    onUpdate({
      children: normalizeSlotCycle(
        slots.filter((s) => s.id !== slotId),
        node.cascade_ratio ?? 2,
      ),
    });
  };

  // Item management is now inline per-slot in the settings UI

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
    <>
      <Drawer
        opened={opened}
        onClose={handleClose}
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
                const patch: Partial<TodoTaskNode> = {
                  task_type: val as TodoTaskNode['task_type'],
                };
                if (val === 'rotating' && !node.children?.length) {
                  // Slots are ordinary children — seed two priority groups
                  patch.children = createEmptyNode('rotating').children;
                  patch.tally = 0;
                }
                if (val === 'line_item') {
                  patch.completed = false;
                  if (!node.sub_items) patch.sub_items = [];
                }
                if (val === 'category' || val === 'priority_group') {
                  if (!node.children) patch.children = [];
                }
                onUpdate(patch);
              }
            }}
          />

          <Divider label="Schedule" labelPosition="left" />
          {calendars.length > 0 ? (
            <Stack gap="xs">
              <Select
                placeholder="Select calendar..."
                data={[
                  { value: '__all__', label: 'All days' },
                  ...calendars.map((c) => ({ value: String(c.id), label: c.name })),
                  { value: '__custom__', label: 'Custom days...' },
                ]}
                value={
                  node.calendar_rules && node.calendar_rules.length > 0
                    ? String(node.calendar_rules[0].calendar_id)
                    : showCustomSchedule
                      ? '__custom__'
                      : schedule.length === 7
                        ? '__all__'
                        : '__custom__'
                }
                onChange={(val) => {
                  if (val === '__all__') {
                    updateSchedule(ALL_DAYS);
                    onUpdate({ calendar_rules: undefined } as Partial<TodoTaskNode>);
                    setShowCustomSchedule(false);
                  } else if (val === '__custom__') {
                    onUpdate({ calendar_rules: undefined } as Partial<TodoTaskNode>);
                    setShowCustomSchedule(true);
                  } else if (val) {
                    const cal = calendars.find((c) => String(c.id) === val);
                    if (cal) {
                      onUpdate({
                        calendar_rules: [
                          { calendar_id: cal.id, calendar_name: cal.name, mode: 'add' as const },
                        ],
                        schedule: cal.days_of_week ?? ALL_DAYS,
                      });
                      setShowCustomSchedule(false);
                    }
                  }
                }}
                size="sm"
              />
              {showCustomSchedule && (
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
                </Group>
              )}
            </Stack>
          ) : (
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
          )}

          {/* Tracking mode — available for all node types */}
          <Select
            label="Tracking mode"
            value={getTrackingMode(node)}
            data={[
              { value: 'units', label: 'Units' },
              { value: 'hours', label: 'Hours' },
            ]}
            onChange={(val) =>
              onUpdate({ tracking_mode: (val as 'units' | 'hours') ?? DEFAULT_TRACKING_MODE })
            }
            size="sm"
          />
          {getTrackingMode(node) === 'hours' ? (
            <TextInput
              label="Hours per day"
              description="Format: h:mm (e.g. 0:15, 1:30)"
              defaultValue={formatHoursHHMM(node.tally_step ?? 0)}
              key={node.tally_step}
              size="sm"
              w={120}
              placeholder="0:15"
              onBlur={(e) => {
                const val = parseHHMM(e.target.value);
                if (!isNaN(val) && val !== (node.tally_step ?? 0))
                  setAllotmentChange({ value: val });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseHHMM((e.target as HTMLInputElement).value);
                  if (!isNaN(val) && val !== (node.tally_step ?? 0))
                    setAllotmentChange({ value: val });
                }
              }}
            />
          ) : (
            <SimpleGrid cols={2} spacing="xs">
              <NumberInput
                label="Units per day"
                value={node.tally_step ?? 0}
                min={0}
                step={0.5}
                decimalScale={1}
                size="sm"
                onChange={(val) => onUpdate({ tally_step: typeof val === 'number' ? val : 0 })}
              />
              <NumberInput
                label="Hours per unit"
                value={node.time_budget_hours ?? 0}
                min={0}
                step={0.25}
                decimalScale={2}
                size="sm"
                onChange={(val) =>
                  onUpdate({ time_budget_hours: typeof val === 'number' ? val : 0 })
                }
              />
            </SimpleGrid>
          )}

          {/* Rotating slot editor — same style as category children, with per-slot item lists.
                    Slots reorder by drag (type SLOT); items drag within/between priority groups
                    (type ITEM). Removing/adding a slot normalizes the rotation cycle. */}
          {node.task_type === 'rotating' && (
            <>
              <Divider label="Priority Groups" labelPosition="left" />
              <DragDropContext
                onDragEnd={(result: DropResult) => {
                  if (!result.destination) return;
                  const from = result.source.index;
                  const to = result.destination.index;

                  if (result.type === 'SLOT') {
                    if (from === to) return;
                    const reordered = [...slots];
                    const [moved] = reordered.splice(from, 1);
                    reordered.splice(to, 0, moved);
                    onUpdate({ children: reordered });
                    return;
                  }

                  // ITEM drag within/between priority_group slots
                  const srcSlotId = result.source.droppableId.replace('slot-items-', '');
                  const dstSlotId = result.destination.droppableId.replace('slot-items-', '');
                  if (srcSlotId === dstSlotId && from === to) return;
                  const srcIdx = slots.findIndex((s) => s.id === srcSlotId);
                  const dstIdx = slots.findIndex((s) => s.id === dstSlotId);
                  if (srcIdx < 0 || dstIdx < 0) return;

                  const updated = slots.map((s) => ({ ...s, children: [...(s.children ?? [])] }));
                  const [movedItem] = updated[srcIdx].children!.splice(from, 1);
                  updated[dstIdx].children!.splice(to, 0, movedItem);
                  onUpdate({ children: updated });
                }}
              >
                <Droppable droppableId="rotating-slots" type="SLOT">
                  {(slotsProvided) => (
                    <Stack gap="sm" ref={slotsProvided.innerRef} {...slotsProvided.droppableProps}>
                      {slots.map((slot, slotIdx) => (
                        <Draggable key={slot.id} draggableId={`slot-${slot.id}`} index={slotIdx}>
                          {(slotDrag) => (
                            <Stack
                              gap="xs"
                              ref={slotDrag.innerRef}
                              {...slotDrag.draggableProps}
                              style={{
                                ...slotDrag.draggableProps.style,
                                borderLeft:
                                  '3px solid var(--polis-color-primary, var(--mantine-color-blue-2))',
                                paddingLeft: 12,
                              }}
                            >
                              <Group gap="xs" wrap="nowrap">
                                <div {...slotDrag.dragHandleProps} style={{ cursor: 'grab' }}>
                                  <IconGripVertical
                                    size={14}
                                    color="var(--polis-color-text-muted, var(--mantine-color-gray-5))"
                                  />
                                </div>
                                <Badge size="sm" variant="light">
                                  #{slotIdx + 1}
                                </Badge>
                                <Select
                                  size="xs"
                                  w={110}
                                  value={slot.task_type}
                                  data={[
                                    { value: 'priority_group', label: 'Priority' },
                                    { value: 'line_item', label: 'Task' },
                                    { value: 'rotating', label: 'Rotating' },
                                  ]}
                                  onChange={(val) => {
                                    if (!val || val === slot.task_type) return;
                                    const patch: Partial<TodoTaskNode> = {
                                      task_type: val as TodoTaskNode['task_type'],
                                      count_this_group: slot.count_this_group ?? 0,
                                    };
                                    if (val === 'rotating' && !slot.children?.length) {
                                      patch.children = createEmptyNode('rotating').children;
                                    }
                                    if (val === 'priority_group' && !slot.children) {
                                      patch.children = [];
                                    }
                                    if (val === 'line_item') {
                                      // A bare task slot is its own completion target
                                      patch.show_checkmark = true;
                                    }
                                    onUpdate({
                                      children: slots.map((s) =>
                                        s.id === slot.id ? { ...s, ...patch } : s,
                                      ),
                                    });
                                  }}
                                />
                                <TextInput
                                  value={slot.label ?? ''}
                                  size="xs"
                                  style={{ flex: 1 }}
                                  placeholder={`Slot #${slotIdx + 1} label`}
                                  onChange={(e) => {
                                    onUpdate({
                                      children: slots.map((s) =>
                                        s.id === slot.id ? { ...s, label: e.target.value } : s,
                                      ),
                                    });
                                  }}
                                />
                                {slots.length > 1 && (
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    size="xs"
                                    onClick={() => removeSlot(slot.id)}
                                    title="Remove slot"
                                  >
                                    <IconTrash size={12} />
                                  </ActionIcon>
                                )}
                              </Group>
                              {slot.task_type === 'priority_group' && (
                                <>
                                  <Droppable droppableId={`slot-items-${slot.id}`} type="ITEM">
                                    {(provided) => (
                                      <Stack
                                        gap="xs"
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        pl="sm"
                                        style={{ minHeight: 4 }}
                                      >
                                        {(slot.children ?? []).map((child, childIdx) => (
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
                                                <div
                                                  {...dragProvided.dragHandleProps}
                                                  style={{ cursor: 'grab' }}
                                                >
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
                                                    onUpdate({
                                                      children: slots.map((s) =>
                                                        s.id === slot.id
                                                          ? {
                                                              ...s,
                                                              children: (s.children ?? []).map(
                                                                (c, ci) =>
                                                                  ci === childIdx
                                                                    ? {
                                                                        ...c,
                                                                        label: e.target.value,
                                                                      }
                                                                    : c,
                                                              ),
                                                            }
                                                          : s,
                                                      ),
                                                    });
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
                                                    if (
                                                      val === 'rotating' &&
                                                      !child.children?.length
                                                    ) {
                                                      patch.children =
                                                        createEmptyNode('rotating').children;
                                                    }
                                                    onUpdate({
                                                      children: slots.map((s) =>
                                                        s.id === slot.id
                                                          ? {
                                                              ...s,
                                                              children: (s.children ?? []).map(
                                                                (c, ci) =>
                                                                  ci === childIdx
                                                                    ? { ...c, ...patch }
                                                                    : c,
                                                              ),
                                                            }
                                                          : s,
                                                      ),
                                                    });
                                                  }}
                                                />
                                                <ActionIcon
                                                  variant="subtle"
                                                  color="red"
                                                  size="xs"
                                                  onClick={() => {
                                                    onUpdate({
                                                      children: slots.map((s) =>
                                                        s.id === slot.id
                                                          ? {
                                                              ...s,
                                                              children: (s.children ?? []).filter(
                                                                (_, i) => i !== childIdx,
                                                              ),
                                                            }
                                                          : s,
                                                      ),
                                                    });
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
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === 'Enter' &&
                                          (e.target as HTMLInputElement).value.trim()
                                        ) {
                                          const child: TodoTaskNode = {
                                            id: makeId('ri'),
                                            task_type: 'line_item',
                                            label: (e.target as HTMLInputElement).value.trim(),
                                            on_copy: 'preserve',
                                          };
                                          onUpdate({
                                            children: slots.map((s) =>
                                              s.id === slot.id
                                                ? { ...s, children: [...(s.children ?? []), child] }
                                                : s,
                                            ),
                                          });
                                          (e.target as HTMLInputElement).value = '';
                                        }
                                      }}
                                    />
                                  </Group>
                                </>
                              )}
                            </Stack>
                          )}
                        </Draggable>
                      ))}
                      {slotsProvided.placeholder}
                    </Stack>
                  )}
                </Droppable>
              </DragDropContext>
              <Group gap="xs">
                <Select
                  placeholder="Add slot..."
                  size="xs"
                  data={[
                    { value: 'priority_group', label: 'Priority Group' },
                    { value: 'line_item', label: 'Task' },
                    { value: 'rotating', label: 'Rotating' },
                  ]}
                  onChange={(val) => {
                    if (val) addSlot(val as 'priority_group' | 'line_item' | 'rotating');
                  }}
                  value={null}
                  style={{ flex: 1 }}
                />
              </Group>
            </>
          )}

          <Switch
            label="Show checkmark & date"
            description="Toggle the mark-done button and last-done date"
            size="xs"
            checked={node.show_checkmark ?? false}
            onChange={(e) => onUpdate({ show_checkmark: e.currentTarget.checked })}
          />
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

      <Modal
        opened={allotmentChange !== null}
        onClose={() => setAllotmentChange(null)}
        title="Apply new daily allotment"
        centered
        size="sm"
        zIndex={2100}
      >
        <Stack gap="md">
          <Text size="sm">
            Change the daily time to{' '}
            <b>{allotmentChange ? formatHoursHHMM(allotmentChange.value) : ''}</b> starting when?
          </Text>
          <Text size="xs" c="dimmed">
            “Today” adjusts today’s balance for the difference if today’s time has already accrued.
            “Tomorrow” applies from the next day onward.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button
              variant="default"
              onClick={() => {
                if (allotmentChange) onUpdate({ tally_step: allotmentChange.value });
                setAllotmentChange(null);
              }}
            >
              Tomorrow
            </Button>
            <Button
              onClick={() => {
                if (allotmentChange)
                  onUpdate({
                    tally_step: allotmentChange.value,
                    _allotment_change_today: true,
                  } as Partial<TodoTaskNode>);
                setAllotmentChange(null);
              }}
            >
              Today
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default TodoTaskSettingsDrawer;
