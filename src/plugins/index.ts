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
