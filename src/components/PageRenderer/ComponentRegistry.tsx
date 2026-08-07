import React, { lazy } from 'react';

export interface ComponentProps {
  componentId: number;
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => Promise<void>;
  /** Update displayed config without persisting to config_json — used by todo_task PATCH flow */
  onDisplayUpdate: (config: Record<string, unknown>) => void;
  userId: number;
  pageParams?: Record<string, string>;
}

type LazyComponent = React.LazyExoticComponent<React.FC<ComponentProps>>;
export type RegistrableComponent = LazyComponent | React.ComponentType<ComponentProps>;

const registry: Record<string, RegistrableComponent> = {
  day_summary: lazy(() => import('./widgets/DaySummaryWidget')),
  stats_cards: lazy(() => import('./widgets/StatsCardsWidget')),
  settings_panel: lazy(() => import('./widgets/SettingsPanelWidget')),
  page_manager: lazy(() => import('./widgets/PageManagerWidget')),
  todo: lazy(() => import('./widgets/TodoTaskWidget')),
  todo_task: lazy(() => import('./widgets/TodoTaskWidget')),
  todo_bullet_list: lazy(() => import('./widgets/TodoBulletListWidget')),
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
