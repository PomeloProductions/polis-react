import React from 'react';

/**
 * Generic dynamic-component-registry primitive.
 *
 * A page/dashboard renderer maps a stored `component_type` string to a React
 * component to render. Historically PolisOS hard-coded that map (with the todo
 * widgets baked in). This factory makes the map a runtime, per-consumer
 * concern: `@polis/react` ships the mechanism, the consumer registers its own
 * widgets against it.
 *
 * Widgets are typically `React.lazy(...)` so they code-split, but any component
 * (or lazy component) is accepted.
 */

/**
 * Base props every registered widget receives. Consumers may register widgets
 * with a wider prop type as long as it is assignable from this — the widget
 * decides how to read `config`.
 */
export interface ComponentProps {
  componentId: number;
  config: Record<string, unknown>;
  /** Persist a new config (writes through to the backend). */
  onConfigChange: (config: Record<string, unknown>) => Promise<void>;
  /** Update displayed config WITHOUT persisting — for optimistic/local edits. */
  onDisplayUpdate: (config: Record<string, unknown>) => void;
  userId: number;
  pageParams?: Record<string, string>;
}

/** A component acceptable for registration — eager or `React.lazy`. */
export type RegisterableComponent<P extends ComponentProps = ComponentProps> =
  | React.ComponentType<P>
  | React.LazyExoticComponent<React.ComponentType<P>>;

export interface ComponentRegistry<P extends ComponentProps = ComponentProps> {
  /** Register (or overwrite) the component for `componentType`. */
  register(componentType: string, component: RegisterableComponent<P>): void;
  /** Register many at once. */
  registerMany(entries: Record<string, RegisterableComponent<P>>): void;
  /** Resolve a component, or `null` if the type is unregistered. */
  getComponent(componentType: string): RegisterableComponent<P> | null;
  /** All registered type keys. */
  getRegisteredTypes(): string[];
  /** Whether a type is registered. */
  has(componentType: string): boolean;
}

/**
 * Create an isolated component registry. Each consumer app creates one (or uses
 * {@link defaultComponentRegistry}) and registers its widgets at startup.
 */
export function createComponentRegistry<
  P extends ComponentProps = ComponentProps,
>(): ComponentRegistry<P> {
  const registry: Record<string, RegisterableComponent<P>> = {};

  return {
    register(componentType, component) {
      registry[componentType] = component;
    },
    registerMany(entries) {
      for (const [type, component] of Object.entries(entries)) {
        registry[type] = component;
      }
    },
    getComponent(componentType) {
      return registry[componentType] ?? null;
    },
    getRegisteredTypes() {
      return Object.keys(registry);
    },
    has(componentType) {
      return componentType in registry;
    },
  };
}

/**
 * A shared, module-level registry for apps that only need one. Consumers that
 * want isolation (tests, multiple independent renderers) should make their own
 * via {@link createComponentRegistry}.
 */
export const defaultComponentRegistry = createComponentRegistry();
