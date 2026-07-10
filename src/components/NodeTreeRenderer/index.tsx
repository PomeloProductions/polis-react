import React from 'react';
import { Stack, Group } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import type { TreeNode, NodePath } from '../../util/node-tree-utils';

/**
 * Generic, domain-agnostic recursive node-tree renderer.
 *
 * This is the todo-agnostic form of PolisOS's `TodoTaskNodeRenderer`. It owns
 * only the *structural* concerns of rendering a recursive tree:
 *
 *   - recursion over `node.children` (via the `renderChildren` helper handed to
 *     the delegate),
 *   - optional drag-and-drop scaffolding (`Droppable` per container + a
 *     `Draggable` grip handle per child), using `@hello-pangea/dnd`,
 *   - passing the current `path` / `depth` / `siblingIndex` down.
 *
 * ALL node-body rendering — labels, tally/schedule/balance/checkoff, settings
 * drawers, add-child inputs, and any domain logic — is delegated to the
 * consumer-supplied {@link NodeRenderDelegate}. `@polis/react` therefore holds
 * zero todo (or any domain) knowledge; the consumer's delegate does.
 */

/** Arguments handed to the render delegate for a single node. */
export interface NodeRenderArgs<T extends TreeNode> {
  node: T;
  path: NodePath;
  depth: number;
  siblingIndex?: number;
  /**
   * Render this node's `children` (recursively) with the framework's DnD
   * scaffolding. Call it from wherever the delegate wants the children to
   * appear. Returns `null` when the node has no children.
   */
  renderChildren: () => React.ReactNode;
}

/** The consumer's per-node body renderer. */
export type NodeRenderDelegate<T extends TreeNode> = (args: NodeRenderArgs<T>) => React.ReactNode;

export interface NodeTreeRendererProps<T extends TreeNode> {
  /** The node to render. */
  node: T;
  /** Path from the root to this node (`[]` at the root). */
  path?: NodePath;
  /** Consumer body renderer for a single node. */
  renderNode: NodeRenderDelegate<T>;
  /** Current recursion depth (0 at the root). */
  depth?: number;
  /** This node's index among its siblings, if any. */
  siblingIndex?: number;
  /**
   * Enable drag-and-drop scaffolding. When `false` (default) children are
   * rendered in a plain `Stack` with no grip handles or droppables — the
   * consumer must still provide a surrounding `DragDropContext` when `true`.
   */
  draggable?: boolean;
  /**
   * Build the `droppableId` for a container node at `path`. Required when
   * `draggable` is `true`. The consumer's `DragDropContext.onDragEnd` parses
   * these ids to know where a drop landed.
   */
  buildDroppableId?: (path: NodePath) => string;
  /**
   * The dnd droppable/draggable `type`. Must match the surrounding
   * `DragDropContext` usage. Defaults to `'NODE_TREE'`.
   */
  dndType?: string;
}

/**
 * Render a node tree. The component renders `node`'s own body via `renderNode`,
 * and hands the delegate a `renderChildren()` that recursively renders
 * `node.children` (with DnD scaffolding when enabled).
 */
function NodeTreeRenderer<T extends TreeNode>(props: NodeTreeRendererProps<T>): React.ReactElement {
  const {
    node,
    path = [],
    renderNode,
    depth = 0,
    siblingIndex,
    draggable = false,
    buildDroppableId,
    dndType = 'NODE_TREE',
  } = props;

  const children = (node.children ?? []) as T[];

  const renderChildNode = (child: T, idx: number) => (
    <NodeTreeRenderer<T>
      key={child.id}
      node={child}
      path={[...path, idx]}
      renderNode={renderNode}
      depth={depth + 1}
      siblingIndex={idx}
      draggable={draggable}
      buildDroppableId={buildDroppableId}
      dndType={dndType}
    />
  );

  const renderChildren = (): React.ReactNode => {
    if (children.length === 0 && !draggable) return null;

    // Plain (non-draggable) recursion.
    if (!draggable) {
      return <Stack gap="xs">{children.map((child, idx) => renderChildNode(child, idx))}</Stack>;
    }

    // Draggable recursion — wrap in a Droppable, each child in a Draggable with
    // a grip handle. Mirrors the structural pattern of TodoTaskNodeRenderer.
    if (!buildDroppableId) {
      throw new Error('NodeTreeRenderer: `buildDroppableId` is required when `draggable` is true.');
    }
    const droppableId = buildDroppableId(path);

    return (
      <Droppable droppableId={droppableId} type={dndType}>
        {(provided, snapshot) => (
          <Stack
            gap="xs"
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              minHeight: 24,
              transition: 'background-color 0.15s',
              ...(snapshot.isDraggingOver
                ? {
                    backgroundColor: 'var(--mantine-color-blue-0)',
                    borderRadius: 4,
                    outline: '2px dashed var(--mantine-color-blue-4)',
                    outlineOffset: 2,
                  }
                : {}),
            }}
          >
            {children.map((child, idx) => (
              <Draggable key={child.id} draggableId={child.id} index={idx}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    style={{
                      ...dragProvided.draggableProps.style,
                      ...(dragSnapshot.isDragging
                        ? {
                            opacity: 0.9,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            backgroundColor: '#fff',
                            borderRadius: 4,
                          }
                        : {}),
                    }}
                  >
                    <Group gap={4} wrap="nowrap" align="flex-start">
                      <div
                        {...dragProvided.dragHandleProps}
                        style={{
                          cursor: 'grab',
                          padding: '8px 4px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          alignSelf: 'stretch',
                          minWidth: 20,
                        }}
                      >
                        <IconGripVertical size={16} color="var(--mantine-color-gray-5)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>{renderChildNode(child, idx)}</div>
                    </Group>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </Stack>
        )}
      </Droppable>
    );
  };

  return (
    <>
      {renderNode({
        node,
        path,
        depth,
        siblingIndex,
        renderChildren,
      })}
    </>
  );
}

export default NodeTreeRenderer;
