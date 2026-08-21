import React, { Suspense, useCallback, useContext, useState } from 'react';
import { Loader, Stack, Alert, Group, Tooltip, ActionIcon, Drawer } from '@mantine/core';
import { IconSettings, IconGripVertical } from '@tabler/icons-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { UserPage } from '../../models/user/user-page';
import { getComponent, ComponentProps } from './ComponentRegistry';
import { UserPagesContext } from '../../contexts/UserPagesContext';
import { getComponentGuide } from '../../pages/ComponentGuide/componentMetadata';
import ConfigEditor from '../../pages/ComponentGuide/ConfigEditor';
import { defaultPageTypeRegistry } from '../../util/page-type-registry';

interface PageRendererProps {
  page: UserPage;
  userId: number;
  pageParams?: Record<string, string>;
  /**
   * Called after a drag reorder is persisted so the consumer can refresh its
   * page data. No-op when not provided.
   */
  onRefresh?: () => void | Promise<void>;
}

const PageRenderer: React.FC<PageRendererProps> = ({ page, userId, pageParams, onRefresh }) => {
  const { editComponent } = useContext(UserPagesContext);
  const [configOpenId, setConfigOpenId] = useState<number | null>(null);
  // Optimistic local config overrides so widgets see changes immediately
  const [localConfigs, setLocalConfigs] = useState<Record<number, Record<string, unknown>>>({});

  // Reset local overrides when the page changes (e.g. navigating to a different page)
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

  // Draggability is driven by the page-type registry so the renderer stays generic.
  const draggable = defaultPageTypeRegistry.isDraggable(page.page_type);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const { source, destination } = result;
      if (source.index === destination.index) return;

      // Reorder top-level page components by display_order.
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
      Promise.all(updates).then(() => void onRefresh?.());
    },
    [components, page.id, editComponent, onRefresh],
  );

  if (components.length === 0) {
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

      if (draggable) {
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
      {draggable ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="page-components">
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
