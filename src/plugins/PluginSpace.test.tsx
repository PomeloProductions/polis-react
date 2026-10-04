import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import PluginSpace from './PluginSpace';
import { registerPlugin, resetPlugins } from './registry';
import { createMemorySpaceAssignmentStore } from './space-model';
import { resetLoaderCache } from './loader';
import type { ComponentProps } from '../components/ComponentRegistry';

const renderSpace = (ui: React.ReactElement) =>
  render(<MantineProvider env="test">{ui}</MantineProvider>);

// A deliverable component that proves it received ComponentProps.
const FeedbackWidget: React.FC<ComponentProps> = ({ userId, config }) => (
  <div>
    feedback for user {userId} label {String((config as { label?: string }).label ?? 'none')}
  </div>
);

describe('<PluginSpace>', () => {
  beforeEach(() => {
    resetPlugins();
    resetLoaderCache();
  });
  afterAll(() => resetPlugins());

  it('renders nothing (the `empty` node) when the space has no assignments', async () => {
    const store = createMemorySpaceAssignmentStore();
    renderSpace(
      <PluginSpace slug="dashboard" userId={1} store={store} empty={<div>no plugins</div>} />,
    );
    expect(await screen.findByText('no plugins')).toBeInTheDocument();
  });

  it('renders an already-registered deliverable assigned to the space', async () => {
    registerPlugin({ key: 'feedback', components: { 'feedback-widget': FeedbackWidget } });
    const store = createMemorySpaceAssignmentStore({
      1: {
        dashboard: [
          {
            pluginSlug: 'feedback',
            component: 'feedback-widget',
            config: { label: 'Hi' },
          },
        ],
      },
    });
    renderSpace(<PluginSpace slug="dashboard" userId={1} store={store} />);
    expect(await screen.findByText(/feedback for user 1 label Hi/)).toBeInTheDocument();
  });

  it('lazily loads an unregistered deliverable via the loader, then renders it', async () => {
    const store = createMemorySpaceAssignmentStore({
      1: { dashboard: [{ pluginSlug: 'feedback', component: 'feedback-widget' }] },
    });
    const loaderConfig = {
      fetchManifest: async () => ({
        slug: 'feedback',
        frontend: [{ bundle: 'index.js', space: 'dashboard', component: 'feedback-widget' }],
      }),
      importBundle: async () => {
        registerPlugin({ key: 'feedback', components: { 'feedback-widget': FeedbackWidget } });
      },
    };
    renderSpace(
      <PluginSpace slug="dashboard" userId={1} store={store} loaderConfig={loaderConfig} />,
    );
    expect(await screen.findByText(/feedback for user 1/)).toBeInTheDocument();
  });

  it('shows a graceful error when a deliverable bundle is missing', async () => {
    // Unique component key: the shared registry has no removal API, so reusing
    // 'feedback-widget' (registered by an earlier test) would short-circuit load.
    const store = createMemorySpaceAssignmentStore({
      1: { dashboard: [{ pluginSlug: 'broken', component: 'broken-widget' }] },
    });
    const loaderConfig = {
      fetchManifest: async () => ({
        slug: 'broken',
        frontend: [{ bundle: 'index.js', space: 'dashboard', component: 'broken-widget' }],
      }),
      importBundle: async () => {
        throw new Error('bundle 404');
      },
    };
    renderSpace(
      <PluginSpace slug="dashboard" userId={1} store={store} loaderConfig={loaderConfig} />,
    );
    expect(await screen.findByText(/bundle 404/)).toBeInTheDocument();
  });

  it('skips disabled assignments', async () => {
    registerPlugin({ key: 'feedback', components: { 'feedback-widget': FeedbackWidget } });
    const store = createMemorySpaceAssignmentStore({
      1: {
        dashboard: [{ pluginSlug: 'feedback', component: 'feedback-widget', enabled: false }],
      },
    });
    renderSpace(
      <PluginSpace slug="dashboard" userId={1} store={store} empty={<div>empty space</div>} />,
    );
    expect(await screen.findByText('empty space')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/feedback for user/)).not.toBeInTheDocument());
  });

  it('renders multiple deliverables in assignment order', async () => {
    const A: React.FC<ComponentProps> = () => <div>widget-A</div>;
    const B: React.FC<ComponentProps> = () => <div>widget-B</div>;
    registerPlugin({ key: 'pa', components: { 'a-widget': A } });
    registerPlugin({ key: 'pb', components: { 'b-widget': B } });
    const store = createMemorySpaceAssignmentStore({
      1: {
        dashboard: [
          { pluginSlug: 'pa', component: 'a-widget', order: 20 },
          { pluginSlug: 'pb', component: 'b-widget', order: 10 },
        ],
      },
    });
    renderSpace(<PluginSpace slug="dashboard" userId={1} store={store} />);
    const b = await screen.findByText('widget-B');
    const a = await screen.findByText('widget-A');
    // B (order 10) precedes A (order 20) in the DOM.
    expect(b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
