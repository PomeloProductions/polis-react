import React, { Suspense, useCallback, useContext, useState } from 'react';
import { Loader, Stack, Alert, Group, Tooltip, ActionIcon, Drawer } from '@mantine/core';
import { IconSettings, IconGripVertical } from '@tabler/icons-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { UserPage } from '../../models/user/user-page';
import { getComponent, ComponentProps } from './ComponentRegistry';
import { UserPagesContext } from '../../contexts/UserPagesContext';
import { TodoContext } from '../../contexts/TodoContext';
import { getComponentGuide } from '../../pages/ComponentGuide/componentMetadata';
import ConfigEditor from '../../pages/ComponentGuide/ConfigEditor';
import {
  TodoTaskNode,
  moveNode,
  updateNodeAtPath,
  getNodeAtPath,
  findNodeById,
  nestNodeInto,
} from '../Todo/todoTaskUtils';
import { MeContext } from '../../contexts/MeContext';
import { patchTodoNode } from '../../services/requests/TodoRequests';
import WelcomeEmptyState from './WelcomeEmptyState';

/** Parse a widget-level droppable ID like "comp:123:drop:0.1" */
function parseWidgetDropId(id: string): { compId: number; path: number[] } | null {
  const match = id.match(/^comp:(\d+):drop:(.*)$/);
  if (!match) return null;
  const compId = parseInt(match[1], 10);
  const pathStr = match[2];
  const path = pathStr === '' ? [] : pathStr.split('.').map(Number);
  return { compId, path };
}

interface PageRendererProps {
  page: UserPage;
  userId: number;
  pageParams?: Record<string, string>;
}

const PageRenderer: React.FC<PageRendererProps> = ({ page, userId, pageParams }) => {
  const { editComponent } = useContext(UserPagesContext);
  const { me } = useContext(MeContext);
  const { silentRefresh } = useContext(TodoContext);
  const [configOpenId, setConfigOpenId] = useState<number | null>(null);
  // Optimistic local config overrides so widgets see changes immediately
  const [localConfigs, setLocalConfigs] = useState<Record<number, Record<string, unknown>>>({});

  // Reset local overrides when the page changes (e.g. navigating to a different day)
  const pageId = page.id;
  const [lastPageId, setLastPageId] = useState(pageId);
  if (pageId !== lastPageId) {
    setLocalConfigs({});
    setLastPageId(pageId);
  }

  const handleConfigChange = useCallback(
    (componentId: number, pId: number) => async (config: Record<string, unknown>) => {
      // Optimistic: update local state immediately
      setLocalConfigs((prev) => ({ ...prev, [componentId]: config }));
      // Persist to server in the background
      await editComponent(pId, componentId, { config_json: config });
    },
    [editComponent],
  );

  // Filter out page_manager — it's rendered in the settings drawer, not inline
  const components = (page.components ?? []).filter((c) => c.component_type !== 'page_manager');

  const isTodoPage = components.some((c) => c.component_type === 'todo_task');

  const getCompConfig = useCallback(
    (compId: number): Record<string, unknown> => {
      const comp = components.find((c) => c.id === compId);
      return localConfigs[compId] ?? (comp?.config_json as Record<string, unknown>) ?? {};
    },
    [components, localConfigs],
  );

  // Compact tall rows BEFORE rbd captures dimensions (sub-item blocks make giant combine
  // dead-zones and lurching placeholders). Must happen in onBeforeCapture — mutating heights
  // after capture desyncs every placeholder position.
  const handleBeforeCapture = useCallback(() => {
    document.body.classList.add('todo-dnd-active');
  }, []);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      document.body.classList.remove('todo-dnd-active');
      // Handle combine (drag onto item to nest)
      if (result.combine) {
        const { source, combine } = result;
        const srcWidget = parseWidgetDropId(source.droppableId);
        const dstWidget = parseWidgetDropId(combine.droppableId);
        if (srcWidget && dstWidget && srcWidget.compId === dstWidget.compId) {
          const config = getCompConfig(srcWidget.compId);
          const root = config.root as TodoTaskNode | undefined;
          if (!root) return;

          // Find the dragged node
          const srcParent =
            srcWidget.path.length === 0 ? root : getNodeAtPath(root, srcWidget.path);
          if (!srcParent?.children || source.index >= srcParent.children.length) return;
          const draggedNode = srcParent.children[source.index];

          // Don't nest into self OR into the dragged node's own subtree — the pointer
          // can combine with a descendant row of the very card being dragged, which
          // would create a parent cycle (and the optimistic nest would drop the node
          // from the tree entirely, since the target vanishes along with it).
          if (draggedNode.id === combine.draggableId) return;
          if (findNodeById(draggedNode, combine.draggableId)) return;

          // Remove dragged node from source
          const newSrcChildren = srcParent.children.filter((_, i) => i !== source.index);
          let updated = updateNodeAtPath(root, srcWidget.path, { children: newSrcChildren });

          // Nest into target (converts to category if needed)
          updated = nestNodeInto(updated, combine.draggableId, draggedNode);

          const newConfig = { ...config, root: updated };
          setLocalConfigs((prev) => ({ ...prev, [srcWidget.compId]: newConfig }));

          // Persist via the ATOMIC _move op — never two children patches (removing the
          // node from its source parent first would let the sync's stale-delete destroy
          // the moved subtree before the second patch could re-home it).
          if (me?.id && draggedNode.id) {
            const targetBefore = findNodeById(root, combine.draggableId);
            const ensureContainer =
              targetBefore && targetBefore.node.task_type === 'line_item'
                ? patchTodoNode(me.id, combine.draggableId, dstWidget.compId, {
                    task_type: 'category',
                  })
                : Promise.resolve(null);
            ensureContainer
              .then(() =>
                patchTodoNode(me.id!, draggedNode.id, srcWidget.compId, {
                  _move: {
                    target_component_id: dstWidget.compId,
                    target_parent_client_id: combine.draggableId,
                    target_sort_order: (targetBefore?.node.children ?? []).length,
                  },
                }),
              )
              .then(() => {
                void silentRefresh();
              })
              .catch((e) => {
                console.error(e);
                // Persistence failed — resync the optimistic view to server truth
                // so the node never appears "gone".
                void silentRefresh();
              });
          }
        }
        return;
      }

      if (!result.destination) return;
      const { source, destination } = result;
      if (source.droppableId === destination.droppableId && source.index === destination.index)
        return;

      const srcIsPage = source.droppableId === 'page-components';
      const dstIsPage = destination.droppableId === 'page-components';
      const srcWidget = !srcIsPage ? parseWidgetDropId(source.droppableId) : null;
      const dstWidget = !dstIsPage ? parseWidgetDropId(destination.droppableId) : null;

      // Case A: Page → Page (reorder components)
      if (srcIsPage && dstIsPage) {
        const sorted = [...components].sort(
          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
        );
        const [moved] = sorted.splice(source.index, 1);
        sorted.splice(destination.index, 0, moved);
        const updates = sorted.map(async (comp, idx) => {
          if (comp.display_order !== idx) {
            return editComponent(page.id!, comp.id!, { display_order: idx });
          }
        });
        Promise.all(updates).then(() => void silentRefresh());
        return;
      }

      // Prevent non-todo_task components from being dropped into widget droppables
      if (srcIsPage && dstWidget) {
        const dragIdMatch = result.draggableId.match(/^page-comp:(\d+)$/);
        if (dragIdMatch) {
          const movedCompId = parseInt(dragIdMatch[1], 10);
          const movedComp = components.find((c) => c.id === movedCompId);
          if (movedComp && movedComp.component_type !== 'todo_task') {
            return; // Only todo_task components can be dropped into categories
          }
        }
      }

      // Case B & C: Widget → Widget (same or cross-component)
      if (srcWidget && dstWidget) {
        if (srcWidget.compId === dstWidget.compId) {
          // Same component: local tree move
          const config = getCompConfig(srcWidget.compId);
          const root = config.root as TodoTaskNode | undefined;
          if (!root) return;

          const updated = moveNode(
            root,
            srcWidget.path,
            source.index,
            dstWidget.path,
            destination.index,
          );
          const newConfig = { ...config, root: updated };
          setLocalConfigs((prev) => ({ ...prev, [srcWidget.compId]: newConfig }));

          if (me?.id) {
            const isSameParent = srcWidget.path.join('.') === dstWidget.path.join('.');
            if (isSameParent) {
              // Pure reorder — a single children patch (all ids present) is safe
              const srcParent =
                srcWidget.path.length === 0 ? root : getNodeAtPath(root, srcWidget.path);
              if (srcParent?.id) {
                const updatedParent =
                  srcWidget.path.length === 0 ? updated : getNodeAtPath(updated, srcWidget.path);
                patchTodoNode(me.id, srcParent.id, srcWidget.compId, {
                  children: (updatedParent.children ?? []).map((c: TodoTaskNode) => ({ id: c.id })),
                }).catch(console.error);
              }
            } else {
              // Cross-parent: use the ATOMIC _move op. Two children patches would
              // let the sync's stale-delete destroy the moved subtree (absent from
              // the source-parent payload) before the destination patch re-homed it.
              const srcParent =
                srcWidget.path.length === 0 ? root : getNodeAtPath(root, srcWidget.path);
              const movedChild = (srcParent?.children ?? [])[source.index];
              const dstParent =
                dstWidget.path.length === 0 ? root : getNodeAtPath(root, dstWidget.path);
              if (movedChild?.id) {
                patchTodoNode(me.id, movedChild.id, srcWidget.compId, {
                  _move: {
                    target_component_id: dstWidget.compId,
                    target_parent_client_id: dstParent?.id ?? null,
                    target_sort_order: destination.index,
                  },
                })
                  .then(() => {
                    void silentRefresh();
                  })
                  .catch((e) => {
                    console.error(e);
                    void silentRefresh(); // resync optimistic view on failure
                  });
              }
            }
          }
        } else {
          // Cross-component: remove from source, add to destination
          const srcConfig = getCompConfig(srcWidget.compId);
          const dstConfig = getCompConfig(dstWidget.compId);
          const srcRoot = srcConfig.root as TodoTaskNode | undefined;
          const dstRoot = dstConfig.root as TodoTaskNode | undefined;
          if (!srcRoot || !dstRoot) return;

          // Get the node being moved
          const srcParent =
            srcWidget.path.length === 0 ? srcRoot : getNodeAtPath(srcRoot, srcWidget.path);
          const movedNode = (srcParent.children ?? [])[source.index];
          if (!movedNode) return;

          // Remove from source
          const srcChildren = [...(srcParent.children ?? [])];
          srcChildren.splice(source.index, 1);
          const updatedSrc =
            srcWidget.path.length === 0
              ? { ...srcRoot, children: srcChildren }
              : updateNodeAtPath(srcRoot, srcWidget.path, { children: srcChildren });

          // Add to destination
          const dstParent =
            dstWidget.path.length === 0 ? dstRoot : getNodeAtPath(dstRoot, dstWidget.path);
          const dstChildren = [...(dstParent.children ?? [])];
          dstChildren.splice(destination.index, 0, movedNode);
          const updatedDst =
            dstWidget.path.length === 0
              ? { ...dstRoot, children: dstChildren }
              : updateNodeAtPath(dstRoot, dstWidget.path, { children: dstChildren });

          // Optimistic update both components
          setLocalConfigs((prev) => ({
            ...prev,
            [srcWidget.compId]: { ...srcConfig, root: updatedSrc },
            [dstWidget.compId]: { ...dstConfig, root: updatedDst },
          }));

          // API: move the node between components
          if (me?.id && movedNode.id) {
            const dstParentNode =
              dstWidget.path.length === 0 ? dstRoot : getNodeAtPath(dstRoot, dstWidget.path);
            patchTodoNode(me.id, movedNode.id, srcWidget.compId, {
              _move: {
                target_component_id: dstWidget.compId,
                target_parent_client_id: dstParentNode?.id ?? null,
                target_sort_order: destination.index,
              },
            })
              .then(() => {
                void silentRefresh();
              })
              .catch(console.error);
          }
        }
        return;
      }

      // Case D: Page-comp → Widget (component into category)
      if (srcIsPage && dstWidget) {
        // Find the dragged component by its draggableId (page-comp:{id})
        const dragIdMatch = result.draggableId.match(/^page-comp:(\d+)$/);
        if (!dragIdMatch) return;
        const movedCompId = parseInt(dragIdMatch[1], 10);
        const movedComp = components.find((c) => c.id === movedCompId);
        if (!movedComp) return;
        const movedConfig = getCompConfig(movedComp.id!);
        const movedRoot = movedConfig.root as TodoTaskNode | undefined;
        if (!movedRoot) return;

        const dstConfig = getCompConfig(dstWidget.compId);
        const dstRoot = dstConfig.root as TodoTaskNode | undefined;
        if (!dstRoot) return;

        // Add the component's root node as a child of the destination
        const dstParent =
          dstWidget.path.length === 0 ? dstRoot : getNodeAtPath(dstRoot, dstWidget.path);
        const dstChildren = [...(dstParent.children ?? [])];
        dstChildren.splice(destination.index, 0, movedRoot);
        const updatedDst =
          dstWidget.path.length === 0
            ? { ...dstRoot, children: dstChildren }
            : updateNodeAtPath(dstRoot, dstWidget.path, { children: dstChildren });

        setLocalConfigs((prev) => ({
          ...prev,
          [dstWidget.compId]: { ...dstConfig, root: updatedDst },
        }));

        if (me?.id && movedRoot.id) {
          const dstParentNode =
            dstWidget.path.length === 0 ? dstRoot : getNodeAtPath(dstRoot, dstWidget.path);
          patchTodoNode(me.id, movedRoot.id, movedComp.id!, {
            _move: {
              target_component_id: dstWidget.compId,
              target_parent_client_id: dstParentNode?.id ?? null,
              target_sort_order: destination.index,
            },
          })
            .then(() => {
              // Refresh the page to reflect the moved component
              void silentRefresh();
            })
            .catch(console.error);
        }
        return;
      }
    },
    [components, page.id, editComponent, getCompConfig, me?.id, silentRefresh],
  );

  if (components.length === 0) {
    // An empty dashboard greets the user and routes to key pages instead of a dead end.
    if (page.page_type === 'dashboard') {
      return <WelcomeEmptyState />;
    }
    return (
      <Alert color="gray" title="Empty Page">
        This page has no components yet. Use the page manager to add components.
      </Alert>
    );
  }

  const configComp = configOpenId != null ? components.find((c) => c.id === configOpenId) : null;
  const configCompConfig = configComp
    ? (localConfigs[configComp.id!] ?? (configComp.config_json as Record<string, unknown>) ?? {})
    : {};
  const configCompType = configComp?.component_type ?? '';
  const configCompGuide = configCompType ? getComponentGuide(configCompType) : undefined;
  const configSaveHandler = configComp
    ? handleConfigChange(configComp.id!, page.id!)
    : async () => {};

  const sorted = [...components].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const renderComponents = () =>
    sorted.map((comp, idx) => {
      const Component = getComponent(comp.component_type);
      if (!Component) {
        return (
          <Alert key={comp.id} color="yellow" title="Unknown Component">
            Unknown component type: {comp.component_type}
          </Alert>
        );
      }

      const guide = getComponentGuide(comp.component_type);
      const hasGear = (guide?.configOptions.length ?? 0) > 0;

      const props: ComponentProps = {
        componentId: comp.id!,
        config: localConfigs[comp.id!] ?? (comp.config_json as Record<string, unknown>) ?? {},
        onConfigChange: handleConfigChange(comp.id!, page.id!),
        onDisplayUpdate: (updatedConfig: Record<string, unknown>) => {
          setLocalConfigs((prev) => ({ ...prev, [comp.id!]: updatedConfig }));
        },
        userId,
        pageParams,
      };

      if (isTodoPage) {
        return (
          <Draggable key={comp.id} draggableId={`page-comp:${comp.id}`} index={idx}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                style={{
                  ...provided.draggableProps.style,
                  ...(snapshot.isDragging ? { opacity: 0.8 } : {}),
                }}
              >
                <Group gap={4} wrap="nowrap" align="flex-start">
                  <div {...provided.dragHandleProps} style={{ cursor: 'grab', paddingTop: 10 }}>
                    <IconGripVertical size={16} color="var(--mantine-color-gray-5)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {hasGear && (
                      <Group justify="flex-end" mb={4}>
                        <Tooltip label="Configure" position="left">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => setConfigOpenId(comp.id!)}
                          >
                            <IconSettings size={15} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    )}
                    <Suspense fallback={<Loader size="sm" />}>
                      <Component {...props} />
                    </Suspense>
                  </div>
                </Group>
              </div>
            )}
          </Draggable>
        );
      }

      return (
        <div key={comp.id}>
          {hasGear && (
            <Group justify="flex-end" mb={4}>
              <Tooltip label="Configure" position="left">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => setConfigOpenId(comp.id!)}
                >
                  <IconSettings size={15} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
          <Suspense fallback={<Loader size="sm" />}>
            <Component {...props} />
          </Suspense>
        </div>
      );
    });

  return (
    <>
      {isTodoPage ? (
        <DragDropContext onDragEnd={handleDragEnd} onBeforeCapture={handleBeforeCapture}>
          <Droppable droppableId="page-components" type="TODO_NODE">
            {(provided) => (
              <Stack gap="md" ref={provided.innerRef} {...provided.droppableProps}>
                {renderComponents()}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <Stack gap="md">{renderComponents()}</Stack>
      )}

      {/* Generic config drawer for components with configOptions */}
      {configComp && configCompGuide && (
        <Drawer
          opened={true}
          onClose={() => setConfigOpenId(null)}
          title={`Configure ${configCompGuide.displayName}`}
          position="right"
          size="md"
          styles={{ title: { fontWeight: 600, fontSize: '1.1rem' } }}
        >
          <ConfigEditor
            options={configCompGuide.configOptions}
            config={configCompConfig}
            onChange={(config) => {
              void configSaveHandler(config);
            }}
          />
        </Drawer>
      )}
    </>
  );
};

export default PageRenderer;
