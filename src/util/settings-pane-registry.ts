import type { ReactNode } from 'react';

/**
 * Generic settings-pane ("package settings manifest") registry.
 *
 * `SettingsPage` historically accepted an `extraTabs` prop so a single consumer
 * app could bolt app-specific tabs onto the built-in Account/Appearance/
 * Organization tabs. That works when ONE app owns the page, but it gives a
 * *package* or *plugin* (a theme, a feature package, a plugin bundle) no way to
 * contribute its own settings surface without the host app threading a prop down
 * for it.
 *
 * This registry fills that gap. `@polisplatform/react` ships the mechanism and a neutral
 * empty default; any package/plugin registers behaviour for its own settings
 * pane at init time (e.g. a theme package calls
 * `registerSettingsPane({ value: 'theme', label: 'Theme', panel: <ThemeSettings/> })`).
 * `SettingsPage` reads `getRegisteredSettingsPanes()` and merges those panes with
 * its `extraTabs` prop — the prop still works exactly as before.
 *
 * The pane shape intentionally MATCHES the `extraTabs` entry shape (plus an
 * optional `order` and `packageId`) so the two sources merge cleanly.
 *
 * @example Register a pane from a package's init module
 *   import { registerSettingsPane } from '@polisplatform/react';
 *   registerSettingsPane({
 *     value: 'theme',
 *     label: 'Theme',
 *     icon: <IconPalette size={16} />,
 *     panel: <ThemeSettingsPanel />,
 *     order: 10,
 *     packageId: '@polis/theme-mantine',
 *   });
 */

/**
 * A registered settings pane. Matches the `ExtraTab` shape consumed by
 * `SettingsPage` so a registered pane and a prop-provided `extraTabs` entry are
 * interchangeable, with two extra optional fields:
 *   - `order`     — ascending sort key among extra panes (default 0).
 *   - `packageId` — informational owner id, for diagnostics / dedupe by owner.
 */
export interface SettingsPaneEntry {
  /** Stable tab value (also the React key + dedupe key). */
  value: string;
  /** Visible tab label. */
  label: string;
  /** Optional leading icon node. */
  icon?: ReactNode;
  /** Rendered tab panel content. */
  panel: ReactNode;
  /** Sort order among extra panes, ascending. Defaults to 0. */
  order?: number;
  /** Optional owning package/plugin id, for diagnostics. */
  packageId?: string;
}

export interface SettingsPaneRegistry {
  /** Register (or replace, by `value`) a single settings pane. */
  register(pane: SettingsPaneEntry): void;
  /** Register several settings panes (later entries replace earlier by `value`). */
  registerMany(panes: SettingsPaneEntry[]): void;
  /**
   * All registered panes, sorted ascending by `order` (default 0), ties broken
   * by `label`. Returns a fresh array (safe to mutate).
   */
  getAll(): SettingsPaneEntry[];
  /** Resolve a pane by `value`; `undefined` if unregistered. */
  get(value: string): SettingsPaneEntry | undefined;
  /** All registered pane values. */
  getRegisteredValues(): string[];
  /** Remove a pane by `value`. */
  unregister(value: string): void;
  /** Clear ALL registered panes. Primarily for tests. */
  reset(): void;
}

function sortPanes(panes: SettingsPaneEntry[]): SettingsPaneEntry[] {
  // Stable-ish sort: ascending `order` (default 0), ties broken by label.
  return [...panes].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label),
  );
}

export function createSettingsPaneRegistry(): SettingsPaneRegistry {
  // Keyed by `value` so re-registering a pane replaces rather than duplicates it.
  const registry: Record<string, SettingsPaneEntry> = {};

  return {
    register(pane) {
      registry[pane.value] = pane;
    },
    registerMany(panes) {
      for (const pane of panes) {
        registry[pane.value] = pane;
      }
    },
    getAll() {
      return sortPanes(Object.values(registry));
    },
    get(value) {
      return registry[value];
    },
    getRegisteredValues() {
      return Object.keys(registry);
    },
    unregister(value) {
      delete registry[value];
    },
    reset() {
      for (const key of Object.keys(registry)) {
        delete registry[key];
      }
    },
  };
}

/** Shared module-level settings-pane registry for apps that only need one. */
export const defaultSettingsPaneRegistry = createSettingsPaneRegistry();

/**
 * Register a settings pane so any mounted `SettingsPage` auto-includes it.
 * Idempotent per `value` (re-registering replaces). Call this from a package's
 * init module.
 */
export function registerSettingsPane(pane: SettingsPaneEntry): void {
  defaultSettingsPaneRegistry.register(pane);
}

/** Register several settings panes at once (later entries replace earlier by `value`). */
export function registerSettingsPanes(panes: SettingsPaneEntry[]): void {
  defaultSettingsPaneRegistry.registerMany(panes);
}

/**
 * All globally-registered settings panes, sorted by `order` then `label`.
 * `SettingsPage` merges these with its `extraTabs` prop (the prop wins on
 * `value` collisions). Returns a fresh array.
 */
export function getRegisteredSettingsPanes(): SettingsPaneEntry[] {
  return defaultSettingsPaneRegistry.getAll();
}

/** Clear the module-level registry. Primarily for tests. */
export function resetRegisteredSettingsPanes(): void {
  defaultSettingsPaneRegistry.reset();
}
