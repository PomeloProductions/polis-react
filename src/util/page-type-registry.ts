/**
 * Generic page-type configuration registry.
 *
 * PolisOS's `DynamicPage`/`PageRenderer` hard-coded behaviour keyed off
 * `page.page_type === 'todo'` (redirect todo pages to a bespoke URL, use a
 * wider container for dashboards, enable drag-and-drop reordering on todo
 * pages, …). That coupling meant `@polis/react` could not host the renderer
 * without importing todo knowledge.
 *
 * This registry replaces those literals with per-consumer config. `@polis/react`
 * ships the mechanism and a neutral default; the consumer registers behaviour
 * for its own page types (e.g. Todo registers a `redirect` + `draggable: true`).
 */

/** A page as seen by the renderer — only the fields page-type config needs. */
export interface PageTypeContext {
  page_type?: string;
  slug?: string;
  config_json?: Record<string, unknown> | null;
}

/**
 * Behaviour associated with a page type. All fields are optional; the renderer
 * falls back to neutral defaults when a type is unregistered.
 */
export interface PageTypeConfig {
  /**
   * If this page type should redirect elsewhere, return the target path.
   * Return `null`/`undefined` to render normally. Receives the page so the
   * consumer can branch on `config_json` (e.g. todo root vs. day pages).
   */
  redirect?: (page: PageTypeContext) => string | null | undefined;
  /** Mantine container size for the page wrapper. Defaults to `'xl'`. */
  containerSize?: string;
  /**
   * Whether components on this page type support drag-and-drop reordering /
   * nesting. Defaults to `false`.
   */
  draggable?: boolean;
}

export interface PageTypeRegistry {
  register(pageType: string, config: PageTypeConfig): void;
  registerMany(entries: Record<string, PageTypeConfig>): void;
  /** Resolve config for a page type; `undefined` if unregistered. */
  get(pageType: string | undefined): PageTypeConfig | undefined;
  getRegisteredTypes(): string[];
  /**
   * Resolve the redirect target for a page (or `null` if none). Convenience for
   * renderers so they don't repeat the null-guarding.
   */
  resolveRedirect(page: PageTypeContext): string | null;
  /** Container size for a page type, applying the `'xl'` default. */
  resolveContainerSize(pageType: string | undefined): string;
  /** Whether a page type is draggable, applying the `false` default. */
  isDraggable(pageType: string | undefined): boolean;
}

const DEFAULT_CONTAINER_SIZE = 'xl';

export function createPageTypeRegistry(): PageTypeRegistry {
  const registry: Record<string, PageTypeConfig> = {};

  return {
    register(pageType, config) {
      registry[pageType] = config;
    },
    registerMany(entries) {
      for (const [type, config] of Object.entries(entries)) {
        registry[type] = config;
      }
    },
    get(pageType) {
      return pageType ? registry[pageType] : undefined;
    },
    getRegisteredTypes() {
      return Object.keys(registry);
    },
    resolveRedirect(page) {
      const config = page.page_type ? registry[page.page_type] : undefined;
      return config?.redirect?.(page) ?? null;
    },
    resolveContainerSize(pageType) {
      const config = pageType ? registry[pageType] : undefined;
      return config?.containerSize ?? DEFAULT_CONTAINER_SIZE;
    },
    isDraggable(pageType) {
      const config = pageType ? registry[pageType] : undefined;
      return config?.draggable ?? false;
    },
  };
}

/** Shared module-level page-type registry for apps that only need one. */
export const defaultPageTypeRegistry = createPageTypeRegistry();
