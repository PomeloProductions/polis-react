import React from 'react';
import { defaultComponentRegistry } from '../components/ComponentRegistry';
import { defaultPageTypeRegistry } from '../util/page-type-registry';
import {
  definePlugin,
  registerPlugin,
  registerPlugins,
  getPluginNavItems,
  getPluginSettingsTabs,
  getPluginRoutes,
  getPluginReduxSlices,
  getRegisteredPlugins,
  isPluginRegistered,
  resetPlugins,
} from './registry';

const Widget: React.FC = () => null;

describe('plugin registry', () => {
  beforeEach(() => resetPlugins());

  it('definePlugin returns its argument unchanged (identity helper)', () => {
    const def = { key: 'x' };
    expect(definePlugin(def)).toBe(def);
  });

  it('empty / no-plugin state is a clean no-op', () => {
    expect(getPluginNavItems()).toEqual([]);
    expect(getPluginSettingsTabs()).toEqual([]);
    expect(getPluginRoutes()).toEqual([]);
    expect(getPluginReduxSlices()).toEqual({});
    expect(getRegisteredPlugins()).toEqual([]);
    expect(isPluginRegistered('nope')).toBe(false);
  });

  it('registering a plugin with no capabilities is a clean no-op', () => {
    registerPlugin({ key: 'bare' });
    expect(isPluginRegistered('bare')).toBe(true);
    expect(getPluginNavItems()).toEqual([]);
    expect(getPluginRoutes()).toEqual([]);
  });

  it('wires components into defaultComponentRegistry', () => {
    registerPlugin({ key: 'p', components: { 'p-widget': Widget } });
    expect(defaultComponentRegistry.has('p-widget')).toBe(true);
    expect(defaultComponentRegistry.getComponent('p-widget')).toBe(Widget);
  });

  it('wires pageTypes into defaultPageTypeRegistry', () => {
    registerPlugin({
      key: 'p',
      pageTypes: { 'p-page': { draggable: true, containerSize: 'lg' } },
    });
    expect(defaultPageTypeRegistry.isDraggable('p-page')).toBe(true);
    expect(defaultPageTypeRegistry.resolveContainerSize('p-page')).toBe('lg');
  });

  it('makes navItems retrievable and sorts by order (ties keep reg order)', () => {
    registerPlugin({
      key: 'a',
      navItems: [
        { key: 'a2', label: 'A2', to: '/a2', order: 20 },
        { key: 'a1', label: 'A1', to: '/a1', order: 10 },
      ],
    });
    registerPlugin({
      key: 'b',
      navItems: [{ key: 'b1', label: 'B1', to: '/b1', order: 15 }],
    });
    expect(getPluginNavItems().map((n) => n.key)).toEqual(['a1', 'b1', 'a2']);
  });

  it('defaults missing order to 0 in sort', () => {
    registerPlugin({
      key: 'a',
      navItems: [
        { key: 'ordered', label: 'O', to: '/o', order: 5 },
        { key: 'unordered', label: 'U', to: '/u' },
      ],
    });
    expect(getPluginNavItems().map((n) => n.key)).toEqual(['unordered', 'ordered']);
  });

  it('merges settingsTabs across multiple plugins', () => {
    registerPlugin({
      key: 'a',
      settingsTabs: [{ value: 'a', label: 'A', panel: null }],
    });
    registerPlugin({
      key: 'b',
      settingsTabs: [{ value: 'b', label: 'B', panel: null }],
    });
    expect(
      getPluginSettingsTabs()
        .map((t) => t.value)
        .sort(),
    ).toEqual(['a', 'b']);
  });

  it('makes routes retrievable + merges across plugins', () => {
    registerPlugin({ key: 'a', routes: [{ path: '/a', element: null }] });
    registerPlugin({ key: 'b', routes: [{ path: '/b', component: Widget, public: true }] });
    const routes = getPluginRoutes();
    expect(routes.map((r) => r.path).sort()).toEqual(['/a', '/b']);
    expect(routes.find((r) => r.path === '/b')?.public).toBe(true);
  });

  it('is idempotent per key — re-register replaces, does not duplicate', () => {
    registerPlugin({ key: 'a', navItems: [{ key: 'v1', label: 'V1', to: '/v1' }] });
    registerPlugin({ key: 'a', navItems: [{ key: 'v2', label: 'V2', to: '/v2' }] });
    expect(getPluginNavItems().map((n) => n.key)).toEqual(['v2']);
    expect(getRegisteredPlugins()).toHaveLength(1);
  });

  it('records reduxSlices but warns they are not mounted (stub)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reducer = (s: number | undefined) => s ?? 0;
    registerPlugin({ key: 'a', reduxSlices: { counter: reducer } });
    expect(getPluginReduxSlices()).toEqual({ counter: reducer });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('reduxSlices'));
    warn.mockRestore();
  });

  it('registerPlugins registers several in order', () => {
    registerPlugins([
      { key: 'a', navItems: [{ key: 'a', label: 'A', to: '/a' }] },
      { key: 'b', navItems: [{ key: 'b', label: 'B', to: '/b' }] },
    ]);
    expect(getRegisteredPlugins().map((p) => p.key)).toEqual(['a', 'b']);
    expect(getPluginNavItems()).toHaveLength(2);
  });

  it('resetPlugins clears all plugin state', () => {
    registerPlugin({ key: 'a', navItems: [{ key: 'a', label: 'A', to: '/a' }] });
    resetPlugins();
    expect(getPluginNavItems()).toEqual([]);
    expect(getRegisteredPlugins()).toEqual([]);
  });
});
