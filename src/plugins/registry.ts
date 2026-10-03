import { defaultComponentRegistry } from '../components/ComponentRegistry';
import { defaultPageTypeRegistry } from '../util/page-type-registry';
import type { ExtraTab } from '../pages/Settings/SettingsPage';
import type { NavItem, PluginDefinition, PluginRoute, Reducer } from './types';

/**
 * The frontend plugin registry — the runtime half of the Polis plugin system.
 *
 * `registerPlugin(def)` fans a plugin's capabilities out to the right sinks:
 *   - `components`   → `defaultComponentRegistry.registerMany`
 *   - `pageTypes`    → `defaultPageTypeRegistry.registerMany`
 *   - `navItems`     → NEW module-level nav registry   (getPluginNavItems)
 *   - `settingsTabs` → NEW module-level settings registry (getPluginSettingsTabs)
 *   - `routes`       → NEW module-level route registry  (getPluginRoutes)
 *   - `reduxSlices`  → recorded only (closed store — documented stub)
 *
 * Registration is idempotent per plugin key: re-registering a plugin replaces
 * that plugin's contributions rather than duplicating them, so hot-reload /
 * double-import under dev servers stays clean.
 */

// ───── Module-level stores, keyed by plugin key so re-registration replaces ─────
const registeredPlugins = new Map<string, PluginDefinition>();
const navItemsByPlugin = new Map<string, NavItem[]>();
const settingsTabsByPlugin = new Map<string, ExtraTab[]>();
const routesByPlugin = new Map<string, PluginRoute[]>();
const reduxSlicesByPlugin = new Map<string, Record<string, Reducer>>();

/**
 * Identity helper for authoring a plugin with full type inference + checking.
 * Purely compile-time; returns its argument unchanged.
 *
 * @example
 *   export default definePlugin({
 *     key: 'todo',
 *     components: { 'todo-list': TodoListWidget },
 *     navItems: [{ key: 'todos', label: 'Todos', to: '/todos/today', order: 10 }],
 *   });
 */
export function definePlugin(def: PluginDefinition): PluginDefinition {
  return def;
}

/**
 * Register a plugin, wiring each of its capabilities into the relevant registry.
 * Idempotent per `def.key`.
 */
export function registerPlugin(def: PluginDefinition): void {
  const { key } = def;
  registeredPlugins.set(key, def);

  if (def.components) {
    defaultComponentRegistry.registerMany(def.components);
  }
  if (def.pageTypes) {
    defaultPageTypeRegistry.registerMany(def.pageTypes);
  }

  // Replace (not append) this plugin's prior contributions so re-register is a
  // no-op-equivalent rather than a duplicate.
  if (def.navItems && def.navItems.length) {
    navItemsByPlugin.set(key, def.navItems);
  } else {
    navItemsByPlugin.delete(key);
  }

  if (def.settingsTabs && def.settingsTabs.length) {
    settingsTabsByPlugin.set(key, def.settingsTabs);
  } else {
    settingsTabsByPlugin.delete(key);
  }

  if (def.routes && def.routes.length) {
    routesByPlugin.set(key, def.routes);
  } else {
    routesByPlugin.delete(key);
  }

  if (def.reduxSlices && Object.keys(def.reduxSlices).length) {
    // STUB: the package store is a closed `useReducer` (data/AppContext), not a
    // dynamically-extensible Redux store. We record the slices so a future store
    // refactor can mount them, and warn so the gap is visible rather than silent.
    reduxSlicesByPlugin.set(key, def.reduxSlices);
    if (typeof console !== 'undefined') {
      console.warn(
        `[plugins] Plugin "${key}" declares reduxSlices (${Object.keys(def.reduxSlices).join(
          ', ',
        )}) but the current @polis/react store does not support dynamic slice ` +
          `injection. These slices are recorded (getPluginReduxSlices) but NOT ` +
          `mounted. Follow-up: make data/AppContext store extensible.`,
      );
    }
  } else {
    reduxSlicesByPlugin.delete(key);
  }
}

/** Register several plugins in order. */
export function registerPlugins(defs: PluginDefinition[]): void {
  defs.forEach(registerPlugin);
}

function sortByOrder<T extends { order?: number }>(items: T[]): T[] {
  // Stable sort by `order` (default 0); input order breaks ties.
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.order ?? 0) - (b.item.order ?? 0) || a.index - b.index)
    .map(({ item }) => item);
}

/**
 * All plugin-contributed nav items, merged across plugins and sorted ascending
 * by `order` (ties keep registration order). The app shell merges these with
 * its own nav. Returns a fresh array (safe to mutate).
 */
export function getPluginNavItems(): NavItem[] {
  const all: NavItem[] = [];
  for (const items of navItemsByPlugin.values()) {
    all.push(...items);
  }
  return sortByOrder(all);
}

/** All plugin-contributed settings tabs, merged across plugins (registration order). */
export function getPluginSettingsTabs(): ExtraTab[] {
  const all: ExtraTab[] = [];
  for (const tabs of settingsTabsByPlugin.values()) {
    all.push(...tabs);
  }
  return all;
}

/** All plugin-contributed routes, merged across plugins (registration order). */
export function getPluginRoutes(): PluginRoute[] {
  const all: PluginRoute[] = [];
  for (const routes of routesByPlugin.values()) {
    all.push(...routes);
  }
  return all;
}

/**
 * Recorded (but NOT mounted) plugin redux slices. Exposed so a future store
 * refactor can consume them. See the stub note in `registerPlugin`.
 */
export function getPluginReduxSlices(): Record<string, Reducer> {
  const all: Record<string, Reducer> = {};
  for (const slices of reduxSlicesByPlugin.values()) {
    Object.assign(all, slices);
  }
  return all;
}

/** All currently-registered plugin definitions (by registration order). */
export function getRegisteredPlugins(): PluginDefinition[] {
  return [...registeredPlugins.values()];
}

/** Whether a plugin with the given key is registered. */
export function isPluginRegistered(key: string): boolean {
  return registeredPlugins.has(key);
}

/**
 * Clear ALL plugin registrations (nav/settings/routes/redux). Does NOT unwind
 * `defaultComponentRegistry` / `defaultPageTypeRegistry` entries (those have no
 * removal API). Primarily for tests.
 */
export function resetPlugins(): void {
  registeredPlugins.clear();
  navItemsByPlugin.clear();
  settingsTabsByPlugin.clear();
  routesByPlugin.clear();
  reduxSlicesByPlugin.clear();
}
