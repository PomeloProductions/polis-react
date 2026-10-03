import React, { ReactNode } from 'react';
import type { ComponentProps, RegisterableComponent } from '../components/ComponentRegistry';
import type { PageTypeConfig } from '../util/page-type-registry';
import type { ExtraTab } from '../pages/Settings/SettingsPage';

/**
 * The FRONTEND half of the Polis plugin contract.
 *
 * This mirrors the backend `Polis\Plugins\PluginContract` (polis-laravel) so a
 * single plugin "manifest" maps cleanly across both halves. Each backend
 * capability that has a frontend surface has a matching field here:
 *
 *   backend capability   →  frontend field
 *   ──────────────────────────────────────────────
 *   bindings             →  components   (what renders a stored component_type)
 *   entity-type          →  pageTypes    (per-page-type render behaviour)
 *   routes               →  routes       (+ navItems to reach them)
 *   config               →  settingsTabs (user-facing config surface)
 *   observers/listeners/ →  reduxSlices  (client-side reactive state;
 *     validators/policies   currently a documented stub — see registry.ts)
 *   migrations           →  (no frontend surface)
 *
 * Everything except `key` is optional; a plugin registers only the capabilities
 * it uses. Registering a plugin with no capabilities is a clean no-op.
 */
export interface PluginDefinition {
  /** Stable unique identifier. Mirrors the backend plugin key. */
  key: string;
  /** Human-readable name (optional, for diagnostics / UI). */
  name?: string;
  /** Plugin version (optional, for diagnostics). */
  version?: string;

  /**
   * Dynamic components keyed by `component_type`. Wired into
   * `defaultComponentRegistry` so `PageRenderer`/`DynamicPage` can resolve them.
   * Mirrors backend `bindings`.
   */
  components?: Record<string, RegisterableComponent<ComponentProps>>;

  /**
   * Per-page-type render behaviour keyed by `page_type`. Wired into
   * `defaultPageTypeRegistry`. Mirrors backend `entity-type`.
   */
  pageTypes?: Record<string, PageTypeConfig>;

  /**
   * Sidebar / navigation entries contributed by the plugin. Consumed by the
   * package shell menu (and exposed via `getPluginNavItems()` /
   * `usePluginNavItems()` for app-owned navs).
   */
  navItems?: NavItem[];

  /**
   * Settings tabs contributed globally (merged into `SettingsPage` alongside
   * its `extraTabs` prop). Mirrors backend `config`.
   */
  settingsTabs?: ExtraTab[];

  /**
   * App routes contributed by the plugin. The Router is app-owned, so these are
   * exposed via `getPluginRoutes()` / `usePluginRoutes()` for the consumer to
   * spread into its route tree. Mirrors backend `routes`.
   */
  routes?: PluginRoute[];

  /**
   * Client-side reducers keyed by slice name. NOTE: the package store is a
   * closed `useReducer` (see `data/AppContext`), so these are recorded but NOT
   * yet mounted into the live store — see `registry.ts` / README for the
   * follow-up. Mirrors the reactive backend capabilities (observers/listeners).
   */
  reduxSlices?: Record<string, Reducer>;
}

/**
 * A sidebar/navigation entry. `order` controls sort (ascending; default 0);
 * `section` lets the shell group items.
 */
export interface NavItem {
  /** Stable key (used as React key + dedupe). */
  key: string;
  /** Visible label. */
  label: ReactNode;
  /** Optional leading icon node. */
  icon?: ReactNode;
  /** Route path the item links to. */
  to: string;
  /** Sort order, ascending. Defaults to 0. */
  order?: number;
  /** Optional grouping section (e.g. 'main', 'admin'). */
  section?: string;
}

/**
 * A plugin-contributed route. Provide EITHER `element` (a ready JSX element) or
 * `component` (a component type the consumer instantiates). `public` marks a
 * route that does not require authentication.
 */
export interface PluginRoute {
  /** Route path, e.g. `/reports` or `/reports/:id`. */
  path: string;
  /** Ready-to-render element. Takes precedence over `component` if both set. */
  element?: ReactNode;
  /** Component type to render (consumer wraps as `<Component />`). */
  component?: React.ComponentType<Record<string, never>>;
  /** Whether the route is reachable without authentication. Defaults false. */
  public?: boolean;
}

/**
 * Minimal reducer shape (kept local to avoid a hard redux dependency in the
 * type surface). Compatible with a standard Redux reducer signature.
 */
export type Reducer<S = unknown, A = unknown> = (state: S | undefined, action: A) => S;
