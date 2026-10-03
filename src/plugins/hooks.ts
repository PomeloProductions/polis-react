import { getPluginNavItems, getPluginRoutes, getPluginSettingsTabs } from './registry';
import type { NavItem, PluginRoute } from './types';
import type { ExtraTab } from '../pages/Settings/SettingsPage';

/**
 * Hooks for app-owned shell surfaces (navs / routers) to consume plugin
 * contributions. Plugins must be registered BEFORE render (typically at module
 * load / app bootstrap), so these read the registry at render time — they are
 * intentionally non-reactive snapshots, not subscriptions.
 */

/**
 * Plugin nav items, merged + sorted by `order`. For an app-owned nav:
 *
 * @example
 *   const pluginNav = usePluginNavItems();
 *   // merge with the app's own items, then render
 */
export function usePluginNavItems(): NavItem[] {
  return getPluginNavItems();
}

/**
 * Plugin routes for spreading into an app-owned Router:
 *
 * @example
 *   const pluginRoutes = usePluginRoutes();
 *   // {pluginRoutes.map((r) => <Route key={r.path} path={r.path} element={r.element ?? <r.component />} />)}
 */
export function usePluginRoutes(): PluginRoute[] {
  return getPluginRoutes();
}

/** Plugin-contributed settings tabs (also auto-merged by `SettingsPage`). */
export function usePluginSettingsTabs(): ExtraTab[] {
  return getPluginSettingsTabs();
}
