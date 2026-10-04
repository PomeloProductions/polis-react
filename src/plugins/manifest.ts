/**
 * The plugin MANIFEST contract — the shape the controller serves for each
 * plugin, and the shape this frontend consumes to load deliverables.
 *
 * This is the agreed cross-agent contract for the Polis plugin system:
 *
 *   {
 *     name, slug, version, image,
 *     frontend: [{ bundle, space, component }],
 *     config_schema
 *   }
 *
 * A plugin ships one or more frontend DELIVERABLES. Each deliverable declares:
 *   - `bundle`    — the JS bundle the controller serves (the deliverable's code)
 *   - `space`     — the named CUSTOMIZABLE SPACE (UI slot) it targets
 *   - `component` — the `component_type` the bundle registers into the
 *                   `defaultComponentRegistry` (via `registerPlugin`), which the
 *                   space resolves + renders.
 *
 * The frontend never trusts the bundle to self-register against the right space:
 * the manifest is the source of truth for placement, and a user's per-space
 * assignment (see `space-model.ts`) decides which deliverables actually render.
 */

/** A single frontend deliverable within a plugin manifest. */
export interface PluginFrontendDeliverable {
  /**
   * URL (absolute, or relative to the controller's plugin-bundle base) of the
   * JS bundle to load. When this bundle module-evaluates it is expected to call
   * `registerPlugin(...)` so its `component` lands in the component registry.
   */
  bundle: string;
  /**
   * The customizable space (named UI slot) this deliverable targets by default.
   * A `<PluginSpace slug="...">` with a matching slug can render it.
   */
  space: string;
  /**
   * The `component_type` key the bundle registers into the component registry.
   * The space resolves this via `defaultComponentRegistry.getComponent(...)`.
   */
  component: string;
  /**
   * Optional human-readable deliverable title (for the customization UI). Falls
   * back to the plugin name when omitted.
   */
  title?: string;
}

/** The full plugin manifest served by the controller. */
export interface PluginManifest {
  /** Human-readable plugin name. */
  name: string;
  /** Stable unique slug. Mirrors the backend plugin slug + the registry `key`. */
  slug: string;
  /** Plugin version string. */
  version: string;
  /** The plugin's container image reference (backend/runner concern; opaque here). */
  image?: string;
  /** Frontend deliverables. Empty/absent when the plugin has no frontend surface. */
  frontend?: PluginFrontendDeliverable[];
  /**
   * JSON-schema-ish description of the plugin's user-facing config. Opaque to
   * the loader; surfaced to any config UI a consumer builds.
   */
  config_schema?: Record<string, unknown>;
}

/**
 * Normalize a raw manifest (from the controller) into a `PluginManifest` with a
 * guaranteed `frontend` array and sane defaults. Returns `null` when the input
 * is unusable (missing slug), so callers can skip it gracefully.
 */
export function normalizeManifest(raw: unknown): PluginManifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const slug = typeof m.slug === 'string' ? m.slug : null;
  if (!slug) return null;

  const frontendRaw = Array.isArray(m.frontend) ? m.frontend : [];
  const frontend: PluginFrontendDeliverable[] = [];
  for (const d of frontendRaw) {
    if (!d || typeof d !== 'object') continue;
    const dd = d as Record<string, unknown>;
    if (
      typeof dd.bundle === 'string' &&
      typeof dd.space === 'string' &&
      typeof dd.component === 'string'
    ) {
      frontend.push({
        bundle: dd.bundle,
        space: dd.space,
        component: dd.component,
        ...(typeof dd.title === 'string' ? { title: dd.title } : {}),
      });
    }
  }

  return {
    name: typeof m.name === 'string' ? m.name : slug,
    slug,
    version: typeof m.version === 'string' ? m.version : '0.0.0',
    ...(typeof m.image === 'string' ? { image: m.image } : {}),
    frontend,
    ...(m.config_schema && typeof m.config_schema === 'object'
      ? { config_schema: m.config_schema as Record<string, unknown> }
      : {}),
  };
}
