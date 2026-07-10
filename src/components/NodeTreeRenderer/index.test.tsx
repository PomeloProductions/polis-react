import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { DragDropContext } from '@hello-pangea/dnd';
import NodeTreeRenderer, { NodeRenderArgs } from './index';
import type { TreeNode } from '../../util/node-tree-utils';

interface DemoNode extends TreeNode {
  label: string;
  children?: DemoNode[];
}

const tree: DemoNode = {
  id: 'root',
  label: 'Root',
  children: [
    { id: 'a', label: 'A' },
    {
      id: 'b',
      label: 'B',
      children: [{ id: 'b1', label: 'B1' }],
    },
  ],
};

// A minimal delegate: render the label + recurse into children.
const delegate = ({ node, path, depth, renderChildren }: NodeRenderArgs<DemoNode>) => (
  <div data-testid={`node-${node.id}`} data-depth={depth} data-path={path.join('.')}>
    <span>{node.label}</span>
    {renderChildren()}
  </div>
);

describe('NodeTreeRenderer', () => {
  it('renders the whole tree via the delegate (non-draggable)', () => {
    render(
      <MantineProvider>
        <NodeTreeRenderer<DemoNode> node={tree} renderNode={delegate} />
      </MantineProvider>,
    );
    expect(screen.getByText('Root')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('B1')).toBeInTheDocument();
  });

  it('passes correct path and depth down the tree', () => {
    render(
      <MantineProvider>
        <NodeTreeRenderer<DemoNode> node={tree} renderNode={delegate} />
      </MantineProvider>,
    );
    expect(screen.getByTestId('node-root').dataset.depth).toBe('0');
    expect(screen.getByTestId('node-a').dataset.path).toBe('0');
    expect(screen.getByTestId('node-b1').dataset.path).toBe('1.0');
    expect(screen.getByTestId('node-b1').dataset.depth).toBe('2');
  });

  it('renders inside a DragDropContext when draggable with a droppable-id builder', () => {
    render(
      <MantineProvider>
        <DragDropContext onDragEnd={() => {}}>
          <NodeTreeRenderer<DemoNode>
            node={tree}
            renderNode={delegate}
            draggable
            buildDroppableId={(path) => `drop:${path.join('.')}`}
            dndType="DEMO"
          />
        </DragDropContext>
      </MantineProvider>,
    );
    expect(screen.getByText('B1')).toBeInTheDocument();
  });
});
