/**
 * Generic, domain-agnostic operations over a recursive tree of nodes.
 *
 * A "node tree" is any structure shaped like `{ id: string; children?: T[] }`.
 * These helpers manipulate the tree by **path** — an array of child indices
 * from the root (e.g. `[0, 2]` = "root's first child's third child"). They are
 * immutable: every mutation returns a new root, sharing untouched subtrees.
 *
 * This module was extracted from PolisOS's Todo feature (`todoTaskUtils`); the
 * todo-specific math (tally/schedule/balance/rotation) stays in the consumer.
 * Everything here relies only on `id` + `children`, so it is reusable by any
 * feature that renders/edits a recursive node tree.
 */

/**
 * Minimal shape every node in a tree must satisfy. Consumers extend this with
 * their own fields (e.g. Todo's `TodoTaskNode` adds `task_type`, `tally`, …).
 */
export interface TreeNode {
  id: string;
  children?: TreeNode[];
}

/** A path is a list of child indices from the root to a target node. */
export type NodePath = number[];

/**
 * Return the node at `path`. `[]` returns the root. Throws nothing — callers
 * are responsible for valid paths (mirrors the original todo behaviour).
 */
export function getNodeAtPath<T extends TreeNode>(root: T, path: NodePath): T {
  let node: TreeNode = root;
  for (const idx of path) {
    node = (node.children ?? [])[idx];
  }
  return node as T;
}

/**
 * Merge `patch` into the node at `path`, returning a new root. `[]` patches the
 * root itself.
 */
export function updateNodeAtPath<T extends TreeNode>(
  root: T,
  path: NodePath,
  patch: Partial<T>,
): T {
  if (path.length === 0) {
    return { ...root, ...patch };
  }

  const [head, ...rest] = path;
  const children = [...(root.children ?? [])] as T[];
  children[head] = updateNodeAtPath(children[head] as T, rest, patch);
  return { ...root, children };
}

/**
 * Remove the node at `path`, returning a new root. A `[]` path is a no-op
 * (you cannot remove the root itself).
 */
export function removeNodeAtPath<T extends TreeNode>(root: T, path: NodePath): T {
  if (path.length === 0) return root;
  if (path.length === 1) {
    const children = [...(root.children ?? [])];
    children.splice(path[0], 1);
    return { ...root, children };
  }

  const [head, ...rest] = path;
  const children = [...(root.children ?? [])] as T[];
  children[head] = removeNodeAtPath(children[head] as T, rest);
  return { ...root, children };
}

/** Append `child` to the children of the node at `path`, returning a new root. */
export function addChildAtPath<T extends TreeNode>(root: T, path: NodePath, child: T): T {
  if (path.length === 0) {
    return { ...root, children: [...(root.children ?? []), child] };
  }

  const [head, ...rest] = path;
  const children = [...(root.children ?? [])] as T[];
  children[head] = addChildAtPath(children[head] as T, rest, child);
  return { ...root, children };
}

/**
 * Find a node by its `id` anywhere in the tree (depth-first). Returns the node
 * and the path to it, or `null` if not found.
 */
export function findNodeById<T extends TreeNode>(
  root: T,
  id: string,
  currentPath: NodePath = [],
): { node: T; path: NodePath } | null {
  if (root.id === id) return { node: root, path: currentPath };
  if (root.children) {
    for (let i = 0; i < root.children.length; i++) {
      const result = findNodeById(root.children[i] as T, id, [...currentPath, i]);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Remove the child at `childIndex` from the parent at `parentPath`. Returns the
 * new root and the removed node, or `null` if the parent/index is invalid.
 */
export function removeChildAtPath<T extends TreeNode>(
  root: T,
  parentPath: NodePath,
  childIndex: number,
): { root: T; removed: T } | null {
  const parent = parentPath.length === 0 ? root : getNodeAtPath(root, parentPath);
  if (!parent?.children || childIndex < 0 || childIndex >= parent.children.length) return null;
  const removed = parent.children[childIndex] as T;
  const newChildren = parent.children.filter((_, i) => i !== childIndex);
  const updatedRoot = updateNodeAtPath(root, parentPath, { children: newChildren } as Partial<T>);
  return { root: updatedRoot, removed };
}

/**
 * Move a child within one parent (reorder) or between two parents. Paths point
 * at the parent nodes; indices are positions within those parents' `children`.
 * Returns a new root.
 */
export function moveNode<T extends TreeNode>(
  root: T,
  srcParentPath: NodePath,
  srcIndex: number,
  dstParentPath: NodePath,
  dstIndex: number,
): T {
  // Same parent — simple reorder.
  if (srcParentPath.join('.') === dstParentPath.join('.')) {
    const parent = getNodeAtPath(root, srcParentPath);
    const children = [...(parent.children ?? [])];
    const [moved] = children.splice(srcIndex, 1);
    children.splice(dstIndex, 0, moved);
    return updateNodeAtPath(root, srcParentPath, { children } as Partial<T>);
  }

  // Cross-parent move: remove from source first, then insert at destination.
  const srcParent = getNodeAtPath(root, srcParentPath);
  const srcChildren = [...(srcParent.children ?? [])];
  const [moved] = srcChildren.splice(srcIndex, 1);

  let updated = updateNodeAtPath(root, srcParentPath, { children: srcChildren } as Partial<T>);

  // Re-fetch destination parent from the updated tree — indices may have shifted.
  const dstParent = getNodeAtPath(updated, dstParentPath);
  const dstChildren = [...(dstParent.children ?? [])];
  dstChildren.splice(dstIndex, 0, moved);

  updated = updateNodeAtPath(updated, dstParentPath, { children: dstChildren } as Partial<T>);
  return updated;
}

/**
 * Move the child at `path` up or down among its siblings. Returns a new root,
 * or the original root if the move would go out of bounds.
 */
export function moveChildAtPath<T extends TreeNode>(
  root: T,
  path: NodePath,
  direction: 'up' | 'down',
): T {
  if (path.length === 0) return root;

  const parentPath = path.slice(0, -1);
  const childIdx = path[path.length - 1];

  const parent = getNodeAtPath(root, parentPath);
  const children = [...(parent.children ?? [])];
  const newIdx = direction === 'up' ? childIdx - 1 : childIdx + 1;
  if (newIdx < 0 || newIdx >= children.length) return root;

  [children[childIdx], children[newIdx]] = [children[newIdx], children[childIdx]];
  return updateNodeAtPath(root, parentPath, { children } as Partial<T>);
}

/**
 * Append `nodeToNest` as a child of the node whose id is `targetId`, anywhere
 * in the tree. Returns a new root. The `transformTarget` callback lets the
 * consumer adjust the target node when it gains a child (e.g. Todo flips
 * `task_type` to `'category'`); by default the target is left as-is.
 */
export function nestNodeInto<T extends TreeNode>(
  root: T,
  targetId: string,
  nodeToNest: T,
  transformTarget?: (target: T) => Partial<T>,
): T {
  const transform = (n: T): T => {
    if (n.id === targetId) {
      const extra = transformTarget ? transformTarget(n) : {};
      return {
        ...n,
        ...extra,
        children: [...(n.children ?? []), nodeToNest],
      };
    }
    if (n.children) {
      return { ...n, children: n.children.map((c) => transform(c as T)) };
    }
    return n;
  };
  return transform(root);
}

/** Generate a reasonably-unique client id with the given prefix. */
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
