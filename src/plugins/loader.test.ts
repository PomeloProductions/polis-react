import React from 'react';
import { loadPlugin, resolveBundleUrl, resetLoaderCache, isDeliverableReady } from './loader';
import { registerPlugin, resetPlugins } from './registry';

const Widget: React.FC = () => null;

describe('resolveBundleUrl', () => {
  it('passes through absolute + protocol-relative URLs', () => {
    expect(resolveBundleUrl('https://cdn/x.js', 'p', '/plugins')).toBe('https://cdn/x.js');
    expect(resolveBundleUrl('//cdn/x.js', 'p', '/plugins')).toBe('//cdn/x.js');
  });

  it('returns the bundle unchanged when no baseUrl', () => {
    expect(resolveBundleUrl('x.js', 'p', undefined)).toBe('x.js');
  });

  it('joins base + slug + bundle and collapses extra slashes', () => {
    expect(resolveBundleUrl('index.js', 'feedback', 'plugins')).toBe('/plugins/feedback/index.js');
    expect(resolveBundleUrl('/dist/index.js', 'feedback', '/plugins/')).toBe(
      '/plugins/feedback/dist/index.js',
    );
  });
});

describe('loadPlugin', () => {
  beforeEach(() => {
    resetPlugins();
    resetLoaderCache();
  });

  const manifest = {
    name: 'Feedback',
    slug: 'feedback',
    version: '1.0.0',
    frontend: [{ bundle: 'index.js', space: 'dashboard', component: 'feedback-widget' }],
  };

  it('fetches manifest, imports bundle, verifies component registered', async () => {
    const importBundle = jest.fn(async () => {
      // A well-behaved bundle registers itself on evaluation.
      registerPlugin({ key: 'feedback', components: { 'feedback-widget': Widget } });
    });
    const result = await loadPlugin('feedback', {
      baseUrl: '/plugins',
      fetchManifest: async () => manifest,
      importBundle,
    });

    expect(importBundle).toHaveBeenCalledWith('/plugins/feedback/index.js');
    expect(result.error).toBeUndefined();
    expect(result.deliverables).toHaveLength(1);
    expect(result.deliverables[0].ok).toBe(true);
    expect(isDeliverableReady('feedback-widget')).toBe(true);
  });

  it('de-duplicates imports of the same bundle URL across calls', async () => {
    const importBundle = jest.fn(async () => {
      registerPlugin({ key: 'feedback', components: { 'feedback-widget': Widget } });
    });
    await loadPlugin('feedback', { fetchManifest: async () => manifest, importBundle });
    await loadPlugin('feedback', { fetchManifest: async () => manifest, importBundle });
    expect(importBundle).toHaveBeenCalledTimes(1);
  });

  it('reports a bundle that loaded but did not register its component', async () => {
    // Use a component key no other test registers (the shared registry has no
    // removal API, so a leaked key would make this false-pass).
    const noregManifest = {
      slug: 'noreg',
      frontend: [{ bundle: 'index.js', space: 'dashboard', component: 'noreg-widget' }],
    };
    const result = await loadPlugin('noreg', {
      fetchManifest: async () => noregManifest,
      importBundle: async () => {
        /* registers nothing */
      },
    });
    expect(result.deliverables[0].ok).toBe(false);
    expect(result.deliverables[0].error).toMatch(/did not register/);
  });

  it('captures a bundle import failure gracefully (never throws)', async () => {
    const failManifest = {
      slug: 'failer',
      frontend: [{ bundle: 'index.js', space: 'dashboard', component: 'failer-widget' }],
    };
    const result = await loadPlugin('failer', {
      fetchManifest: async () => failManifest,
      importBundle: async () => {
        throw new Error('network down');
      },
    });
    expect(result.deliverables[0].ok).toBe(false);
    expect(result.deliverables[0].error).toBe('network down');
  });

  it('captures a manifest fetch failure gracefully', async () => {
    const result = await loadPlugin('feedback', {
      fetchManifest: async () => {
        throw new Error('404');
      },
    });
    expect(result.manifest).toBeNull();
    expect(result.error).toBe('404');
    expect(result.deliverables).toEqual([]);
  });

  it('returns an error for an invalid manifest (no slug)', async () => {
    const result = await loadPlugin('feedback', { fetchManifest: async () => ({ name: 'x' }) });
    expect(result.manifest).toBeNull();
    expect(result.error).toMatch(/Invalid manifest/);
  });

  afterAll(() => resetPlugins());
});
