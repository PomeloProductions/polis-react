import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Alert, Loader, Stack } from '@mantine/core';
import { defaultComponentRegistry, type ComponentProps } from '../components/ComponentRegistry';
import { loadPlugin, type LoaderConfig } from './loader';
import { useSpaceAssignments } from './useSpaceAssignments';
import {
  memorySpaceAssignmentStore,
  type SpaceAssignment,
  type SpaceAssignmentStore,
} from './space-model';

/**
 * A CUSTOMIZABLE SPACE — a named UI slot. `<PluginSpace slug="dashboard">`
 * renders whatever enabled plugin deliverables the end user has assigned to that
 * space, in their chosen order, loading each deliverable's bundle on demand.
 *
 * Spaces are the generic rendering surface of the plugin system: they are not
 * coupled to any one plugin. The feedback plugin is the first consumer; the same
 * `<PluginSpace>` renders N plugins' deliverables.
 *
 * Graceful degradation:
 *   - a space with no assignments renders `empty` (default: nothing);
 *   - a deliverable whose bundle is missing / failed renders `renderError`
 *     (default: a small inline alert) without taking down the rest of the space;
 *   - enable/disable is handled upstream by `assignmentsForSpace` (disabled
 *     placements never reach here).
 */
export interface PluginSpaceProps {
  /** The space slug to render. */
  slug: string;
  /** The current user (for loading their assignments + passing to widgets). */
  userId: number;
  /** Assignment persistence store. Defaults to the in-memory store. */
  store?: SpaceAssignmentStore;
  /** Loader config (controller base URL / overrides). */
  loaderConfig?: LoaderConfig;
  /**
   * Extra props merged into every rendered deliverable. The deliverable receives
   * `ComponentProps`; a space is read-only placement by default, so the config
   * handlers are no-ops unless the consumer supplies real ones here.
   */
  componentProps?: Partial<ComponentProps>;
  /** Rendered when the space has no (enabled) assignments. */
  empty?: React.ReactNode;
  /** Render override for a deliverable that failed to load. */
  renderError?: (assignment: SpaceAssignment, error: string) => React.ReactNode;
}

const noop = () => {};
const asyncNoop = async () => {};

/** Internal: load a plugin's bundles then render one deliverable's component. */
const Deliverable: React.FC<{
  assignment: SpaceAssignment;
  userId: number;
  loaderConfig?: LoaderConfig;
  componentProps?: Partial<ComponentProps>;
  renderError?: (assignment: SpaceAssignment, error: string) => React.ReactNode;
  index: number;
}> = ({ assignment, userId, loaderConfig, componentProps, renderError, index }) => {
  const { pluginSlug, component, config } = assignment;
  // null = loading, '' = ok, string = error
  const [status, setStatus] = useState<null | '' | string>(
    defaultComponentRegistry.has(component) ? '' : null,
  );

  useEffect(() => {
    let cancelled = false;
    if (defaultComponentRegistry.has(component)) {
      setStatus('');
      return;
    }
    setStatus(null);
    void loadPlugin(pluginSlug, loaderConfig).then((result) => {
      if (cancelled) return;
      const d = result.deliverables.find((x) => x.deliverable.component === component);
      if (result.error) {
        setStatus(result.error);
      } else if (d && !d.ok) {
        setStatus(d.error ?? `Deliverable "${component}" failed to load.`);
      } else if (!defaultComponentRegistry.has(component)) {
        setStatus(`Deliverable "${component}" is not available.`);
      } else {
        setStatus('');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pluginSlug, component, loaderConfig]);

  if (status === null) {
    return <Loader size="sm" aria-label={`Loading ${component}`} />;
  }

  if (status !== '') {
    if (renderError) return <>{renderError(assignment, status)}</>;
    return (
      <Alert color="yellow" title="Plugin unavailable">
        {status}
      </Alert>
    );
  }

  const Component = defaultComponentRegistry.getComponent(component);
  if (!Component) {
    const err = `Deliverable "${component}" is not registered.`;
    if (renderError) return <>{renderError(assignment, err)}</>;
    return (
      <Alert color="yellow" title="Plugin unavailable">
        {err}
      </Alert>
    );
  }

  const props: ComponentProps = {
    componentId: index,
    config: config ?? {},
    onConfigChange: asyncNoop,
    onDisplayUpdate: noop,
    userId,
    ...componentProps,
  };

  return (
    <Suspense fallback={<Loader size="sm" />}>
      <Component {...props} />
    </Suspense>
  );
};

const PluginSpace: React.FC<PluginSpaceProps> = ({
  slug,
  userId,
  store = memorySpaceAssignmentStore,
  loaderConfig,
  componentProps,
  empty = null,
  renderError,
}) => {
  const { forSpace, loading } = useSpaceAssignments(userId, store);
  const assignments = useMemo(() => forSpace(slug), [forSpace, slug]);

  if (loading) {
    return <Loader size="sm" aria-label={`Loading ${slug} space`} />;
  }

  if (assignments.length === 0) {
    return <>{empty}</>;
  }

  return (
    <Stack gap="md" data-plugin-space={slug}>
      {assignments.map((a, idx) => (
        <Deliverable
          key={`${a.pluginSlug}:${a.component}:${idx}`}
          assignment={a}
          index={idx}
          userId={userId}
          loaderConfig={loaderConfig}
          componentProps={componentProps}
          renderError={renderError}
        />
      ))}
    </Stack>
  );
};

export default PluginSpace;
