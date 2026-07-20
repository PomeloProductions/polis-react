import {
  getNodeAtPath,
  updateNodeAtPath,
  removeNodeAtPath,
  addChildAtPath,
  findNodeById,
  removeChildAtPath,
  moveNode,
  moveChildAtPath,
  nestNodeInto,
  makeId,
  TreeNode,
} from './node-tree-utils';

// A domain node that extends the minimal TreeNode contract, to prove the
// helpers are generic over consumer-defined shapes.
interface DemoNode extends TreeNode {
  label: string;
  kind?: 'group' | 'leaf';
  children?: DemoNode[];
}

const tree = (): DemoNode => ({
  id: 'root',
  label: 'Root',
  kind: 'group',
  children: [
    { id: 'a', label: 'A', kind: 'leaf' },
    {
      id: 'b',
      label: 'B',
      kind: 'group',
      children: [
        { id: 'b1', label: 'B1', kind: 'leaf' },
        { id: 'b2', label: 'B2', kind: 'leaf' },
      ],
    },
    { id: 'c', label: 'C', kind: 'leaf' },
  ],
});

describe('node-tree-utils', () => {
  describe('getNodeAtPath', () => {
    it('returns the root for []', () => {
      expect(getNodeAtPath(tree(), []).id).toBe('root');
    });
    it('returns a nested node', () => {
      expect(getNodeAtPath(tree(), [1, 0]).id).toBe('b1');
    });
  });

  describe('updateNodeAtPath', () => {
    it('patches the root', () => {
      const r = updateNodeAtPath(tree(), [], { label: 'Renamed' });
      expect(r.label).toBe('Renamed');
    });
    it('patches a nested node immutably', () => {
      const root = tree();
      const r = updateNodeAtPath(root, [1, 1], { label: 'B2!' });
      expect(getNodeAtPath(r, [1, 1]).label).toBe('B2!');
      // Original untouched.
      expect(getNodeAtPath(root, [1, 1]).label).toBe('B2');
    });
  });

  describe('removeNodeAtPath', () => {
    it('removes a top-level child', () => {
      const r = removeNodeAtPath(tree(), [0]);
      expect(r.children?.map((c) => c.id)).toEqual(['b', 'c']);
    });
    it('removes a nested child', () => {
      const r = removeNodeAtPath(tree(), [1, 0]);
      expect(getNodeAtPath(r, [1]).children?.map((c) => c.id)).toEqual(['b2']);
    });
    it('is a no-op for []', () => {
      expect(removeNodeAtPath(tree(), []).children).toHaveLength(3);
    });
  });

  describe('addChildAtPath', () => {
    it('appends to the root', () => {
      const child: DemoNode = { id: 'd', label: 'D', kind: 'leaf' };
      const r = addChildAtPath(tree(), [], child);
      expect(r.children?.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd']);
    });
    it('appends to a nested node', () => {
      const child: DemoNode = { id: 'b3', label: 'B3', kind: 'leaf' };
      const r = addChildAtPath(tree(), [1], child);
      expect(getNodeAtPath(r, [1]).children?.map((c) => c.id)).toEqual(['b1', 'b2', 'b3']);
    });
  });

  describe('findNodeById', () => {
    it('finds a deep node with its path', () => {
      const res = findNodeById(tree(), 'b2');
      expect(res?.path).toEqual([1, 1]);
      expect(res?.node.label).toBe('B2');
    });
    it('returns null when absent', () => {
      expect(findNodeById(tree(), 'nope')).toBeNull();
    });
  });

  describe('removeChildAtPath', () => {
    it('removes and returns the removed node', () => {
      const res = removeChildAtPath(tree(), [1], 0);
      expect(res?.removed.id).toBe('b1');
      expect(getNodeAtPath(res!.root, [1]).children?.map((c) => c.id)).toEqual(['b2']);
    });
    it('returns null for out-of-range index', () => {
      expect(removeChildAtPath(tree(), [1], 9)).toBeNull();
    });
  });

  describe('moveNode', () => {
    it('reorders within the same parent', () => {
      const r = moveNode(tree(), [], 0, [], 2);
      expect(r.children?.map((c) => c.id)).toEqual(['b', 'c', 'a']);
    });
    it('moves across parents', () => {
      // Move top-level 'c' (index 2) into 'b' (path [1]) at index 0. Removing
      // index 2 does not shift 'b' (index 1), so the dst path stays valid.
      const r = moveNode(tree(), [], 2, [1], 0);
      expect(r.children?.map((c) => c.id)).toEqual(['a', 'b']);
      expect(getNodeAtPath(r, [1]).children?.map((c) => c.id)).toEqual(['c', 'b1', 'b2']);
    });
  });

  describe('moveChildAtPath', () => {
    it('moves a child up', () => {
      const r = moveChildAtPath(tree(), [2], 'up');
      expect(r.children?.map((c) => c.id)).toEqual(['a', 'c', 'b']);
    });
    it('is a no-op at the boundary', () => {
      const r = moveChildAtPath(tree(), [0], 'up');
      expect(r.children?.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('nestNodeInto', () => {
    it('appends a node under the target by id', () => {
      const node: DemoNode = { id: 'x', label: 'X', kind: 'leaf' };
      const r = nestNodeInto(tree(), 'a', node);
      expect(getNodeAtPath(r, [0]).children?.map((c) => c.id)).toEqual(['x']);
    });
    it('applies transformTarget when the target gains a child', () => {
      const node: DemoNode = { id: 'x', label: 'X', kind: 'leaf' };
      const r = nestNodeInto(tree(), 'a', node, () => ({ kind: 'group' }));
      expect(getNodeAtPath(r, [0]).kind).toBe('group');
    });
  });

  describe('makeId', () => {
    it('prefixes and produces distinct ids', () => {
      const a = makeId('tn');
      const b = makeId('tn');
      expect(a.startsWith('tn-')).toBe(true);
      expect(a).not.toBe(b);
    });
  });
});
