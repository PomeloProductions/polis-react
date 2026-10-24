import React, { lazy } from 'react';

export interface ComponentProps {
  componentId: number;
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => Promise<void>;
  /** Update displayed config without persisting to config_json — for widgets that manage their own optimistic PATCH flow */
  onDisplayUpdate: (config: Record<string, unknown>) => void;
  userId: number;
  pageParams?: Record<string, string>;
}

type LazyComponent = React.LazyExoticComponent<React.FC<ComponentProps>>;
export type RegistrableComponent = LazyComponent | React.ComponentType<ComponentProps>;

const registry: Record<string, RegistrableComponent> = {
  stats_cards: lazy(() => import('./widgets/StatsCardsWidget')),
  settings_panel: lazy(() => import('./widgets/SettingsPanelWidget')),
  page_manager: lazy(() => import('./widgets/PageManagerWidget')),
};

/**
 * Register app-specific page components. Polis-family apps call this at
 * startup so DynamicPage can render their widgets; app entries override
 * built-ins with the same type.
 */
export function registerComponents(components: Record<string, RegistrableComponent>): void {
  Object.assign(registry, components);
}

export function getComponent(componentType: string): RegistrableComponent | null {
  return registry[componentType] ?? null;
}

export function getRegisteredTypes(): string[] {
  return Object.keys(registry);
}

/**
 * Human-readable labels for component types, shown in the page component picker
 * and the component chip. Only the package's own built-ins are seeded here;
 * consumer-registered types (e.g. PolisOS's `todo_bullet_list`) register their
 * own labels via {@link registerComponentLabels}, mirroring how they register
 * the components themselves with {@link registerComponents}. This keeps
 * app-/domain-specific labels out of the shared package.
 */
const labels: Record<string, string> = {
  stats_cards: 'Stats Cards',
  settings_panel: 'Settings Panel',
  page_manager: 'Page Manager',
};

/**
 * Register app-specific component labels. Polis-family apps call this at startup
 * alongside {@link registerComponents} so the picker and chip show a friendly
 * name; app entries override built-ins with the same type.
 */
export function registerComponentLabels(entries: Record<string, string>): void {
  Object.assign(labels, entries);
}

/**
 * Resolve the display label for a component type, falling back to a
 * de-underscored form of the type when no label is registered.
 */
export function getComponentLabel(componentType: string): string {
  return labels[componentType] ?? componentType.replace(/_/g, ' ');
}
