/**
 * Polis frontend plugin system.
 *
 * `definePlugin` + `registerPlugin` let a plugin contribute components,
 * page-types, nav items, settings tabs and routes to a Polis-family app. This
 * is the frontend half of the contract; it mirrors the backend
 * `Polis\Plugins\PluginContract` in polis-laravel.
 */
export { definePlugin, registerPlugin, registerPlugins } from './registry';
export {
  getPluginNavItems,
  getPluginSettingsTabs,
  getPluginRoutes,
  getPluginReduxSlices,
  getRegisteredPlugins,
  isPluginRegistered,
  resetPlugins,
} from './registry';
export { usePluginNavItems, usePluginRoutes, usePluginSettingsTabs } from './hooks';
export type { PluginDefinition, NavItem, PluginRoute, Reducer } from './types';

// ───── Customizable spaces + deliverables (end-user rendering surface) ─────
export { default as PluginSpace } from './PluginSpace';
export type { PluginSpaceProps } from './PluginSpace';
export { normalizeManifest } from './manifest';
export type { PluginManifest, PluginFrontendDeliverable } from './manifest';
export {
  createMemorySpaceAssignmentStore,
  memorySpaceAssignmentStore,
  assignmentsForSpace,
} from './space-model';
export type { SpaceAssignment, SpaceAssignmentMap, SpaceAssignmentStore } from './space-model';
export { useSpaceAssignments } from './useSpaceAssignments';
export type { UseSpaceAssignments } from './useSpaceAssignments';
export {
  loadPlugin,
  resolveBundleUrl,
  resetLoaderCache,
  isDeliverableReady,
  isPluginLoaded,
} from './loader';
export type { LoaderConfig, DeliverableLoadResult, PluginLoadResult } from './loader';
