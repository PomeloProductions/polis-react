/**
 * The DELIVERABLE LOADER — fetches a plugin's manifest + frontend bundle(s) from
 * the controller and makes their components resolvable by a customizable space.
 *
 * Flow:
 *   1. Fetch the plugin manifest from the controller endpoint.
 *   2. For each frontend deliverable, dynamically import its `bundle`. A bundle
 *      is expected to call `registerPlugin(...)` on evaluation so its `component`
 *      lands in `defaultComponentRegistry`.
 *   3. Verify the declared `component` actually registered; surface a clear error
 *      if a bundle loaded but didn't register what the manifest promised.
 *
 * Loading is idempotent + de-duplicated per bundle URL: a bundle is only
 * imported once even if several spaces reference it. Enable/disable and
 * missing-bundle are handled gracefully (errors are captured, never thrown into
 * render).
 */

import { defaultComponentRegistry } from '../components/ComponentRegistry';
import { isPluginRegistered } from './registry';
import { normalizeManifest, type PluginManifest, type PluginFrontendDeliverable } from './manifest';

/** How to fetch a manifest + import a bundle. Overridable for tests. */
export interface LoaderConfig {
  /**
   * Base URL for the controller's plugin endpoints. A plugin manifest is fetched
   * from `${baseUrl}/${slug}/manifest`. A deliverable `bundle` that is relative
   * is resolved against `${baseUrl}/${slug}/`.
   */
  baseUrl?: string;
  /** Fetch a raw manifest object for a slug. Defaults to a `fetch` of the manifest URL. */
  fetchManifest?: (slug: string) => Promise<unknown>;
  /** Dynamically import a bundle URL. Defaults to a dynamic `import()`. */
  importBundle?: (url: string) => Promise<unknown>;
}

/** Outcome of loading a single deliverable. */
export interface DeliverableLoadResult {
  deliverable: PluginFrontendDeliverable;
  /** True when the declared component is resolvable after load. */
  ok: boolean;
  /** Populated when `ok` is false. */
  error?: string;
}

/** Outcome of loading a whole plugin. */
export interface PluginLoadResult {
  slug: string;
  manifest: PluginManifest | null;
  deliverables: DeliverableLoadResult[];
  /** Populated when the manifest itself could not be fetched/parsed. */
  error?: string;
}

function trimSlashes(s: string): string {
  return s.replace(/^\/+|\/+$/g, '');
}

/** Resolve a (possibly relative) bundle URL against the base + slug. */
export function resolveBundleUrl(
  bundle: string,
  slug: string,
  baseUrl: string | undefined,
): string {
  if (/^https?:\/\//i.test(bundle) || bundle.startsWith('//')) return bundle;
  if (!baseUrl) return bundle;
  const base = trimSlashes(baseUrl);
  return `/${base}/${trimSlashes(slug)}/${trimSlashes(bundle)}`.replace(/\/{2,}/g, '/');
}

const defaultFetchManifest =
  (baseUrl: string | undefined) =>
  async (slug: string): Promise<unknown> => {
    const base = baseUrl ? `/${trimSlashes(baseUrl)}` : '';
    const url = `${base}/${trimSlashes(slug)}/manifest`.replace(/\/{2,}/g, '/');
    if (typeof fetch !== 'function') {
      throw new Error('No fetch available and no fetchManifest provided to the loader.');
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Manifest fetch for "${slug}" failed: HTTP ${res.status}`);
    return res.json();
  };

const defaultImportBundle = async (url: string): Promise<unknown> => {
  // `@vite-ignore` keeps the bundler from trying to statically analyze a runtime URL.
  return import(/* @vite-ignore */ url);
};

// De-dupe in-flight + completed bundle imports by resolved URL.
const bundleImports = new Map<string, Promise<unknown>>();

/** Clear the bundle-import de-dup cache. For tests. */
export function resetLoaderCache(): void {
  bundleImports.clear();
}

/**
 * Load every frontend deliverable of a plugin by slug: fetch its manifest, import
 * each bundle (de-duplicated), and verify the declared component registered.
 * Never throws — failures are returned in the result for graceful rendering.
 */
export async function loadPlugin(
  slug: string,
  config: LoaderConfig = {},
): Promise<PluginLoadResult> {
  const fetchManifest = config.fetchManifest ?? defaultFetchManifest(config.baseUrl);
  const importBundle = config.importBundle ?? defaultImportBundle;

  let manifest: PluginManifest;
  try {
    const raw = await fetchManifest(slug);
    const normalized = normalizeManifest(raw);
    if (!normalized) {
      return { slug, manifest: null, deliverables: [], error: `Invalid manifest for "${slug}".` };
    }
    manifest = normalized;
  } catch (e) {
    return {
      slug,
      manifest: null,
      deliverables: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const deliverables: DeliverableLoadResult[] = [];
  for (const d of manifest.frontend ?? []) {
    const url = resolveBundleUrl(d.bundle, slug, config.baseUrl);
    try {
      if (!bundleImports.has(url)) {
        bundleImports.set(url, importBundle(url));
      }
      await bundleImports.get(url);

      // A well-behaved bundle registers its component via registerPlugin on eval.
      const registered = defaultComponentRegistry.has(d.component);
      if (!registered) {
        // Drop the cache entry so a later retry re-imports (e.g. transient failure
        // that still resolved but registered nothing).
        bundleImports.delete(url);
        deliverables.push({
          deliverable: d,
          ok: false,
          error: `Bundle "${d.bundle}" loaded but did not register component "${d.component}".`,
        });
        continue;
      }
      deliverables.push({ deliverable: d, ok: true });
    } catch (e) {
      bundleImports.delete(url);
      deliverables.push({
        deliverable: d,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { slug, manifest, deliverables };
}

/**
 * Whether a deliverable's component is ready to render right now — i.e. its
 * component_type is resolvable in the registry (its bundle already loaded + the
 * plugin registered). Cheap synchronous check for render paths.
 */
export function isDeliverableReady(component: string): boolean {
  return defaultComponentRegistry.has(component);
}

/** Whether a plugin has completed registration via the registry. */
export function isPluginLoaded(slug: string): boolean {
  return isPluginRegistered(slug);
}
