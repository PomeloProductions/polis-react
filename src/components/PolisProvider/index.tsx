import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MantineProvider, MantineColorScheme } from '@mantine/core';
import { PolisThemeContext } from '../../theme/PolisThemeContext';
import type { PolisColorTokens, PolisTheme } from '../../theme/PolisTheme';
import {
  applyColorSchemeToDocument,
  ColorSchemeContext,
  getSystemColorScheme,
  readStoredColorScheme,
  writeStoredColorScheme,
  type PolisColorScheme,
  type ResolvedColorScheme,
} from '../../theme/colorScheme';

interface PolisProviderProps {
  theme: PolisTheme;
  /**
   * Initial colour-scheme preference when nothing is persisted yet.
   * `'system'` follows the OS via `prefers-color-scheme`. Defaults to
   * `'system'`.
   */
  defaultAppliedColorScheme?: PolisColorScheme;
  /**
   * Controlled colour-scheme preference. When supplied, `<PolisProvider>`
   * renders this scheme and does NOT persist changes itself — the consumer
   * owns the state (pair with the `onColorSchemeChange` callback). Leave
   * undefined for the built-in localStorage-backed behaviour.
   */
  colorScheme?: PolisColorScheme;
  /** Notified whenever the preference changes (controlled or uncontrolled). */
  onColorSchemeChange?: (scheme: PolisColorScheme) => void;
  /**
   * Forwarded to MantineProvider as `defaultColorScheme`. DEPRECATED for
   * multi-scheme apps — prefer `defaultAppliedColorScheme`. Retained so
   * single-scheme callers that passed this keep compiling. When
   * `defaultAppliedColorScheme` is omitted, a `'light'`/`'dark'` value here
   * seeds the initial preference.
   */
  defaultColorScheme?: MantineColorScheme;
  /**
   * Forwarded to MantineProvider. Single-scheme apps use this to pin the
   * scheme; it also pins the Polis token set to the matching light/dark
   * palette and disables the toggle.
   */
  forceColorScheme?: 'light' | 'dark';
  children: React.ReactNode;
}

/**
 * Maps a `PolisColorTokens` set to the `--polis-color-*` CSS custom property
 * names. Only colour tokens depend on the active scheme; fonts/radius/spacing
 * are scheme-independent and mapped separately.
 */
const colorTokenMap = (colors: PolisColorTokens): Record<string, string> => ({
  '--polis-color-primary': colors.primary,
  '--polis-color-primary-hover': colors.primaryHover,
  '--polis-color-primary-active': colors.primaryActive,
  '--polis-color-primary-tint': colors.primaryTint,
  '--polis-color-primary-subtle': colors.primarySubtle,
  '--polis-color-primary-contrast': colors.primaryContrast,
  '--polis-color-surface': colors.surface,
  '--polis-color-surface-alt': colors.surfaceAlt,
  '--polis-color-text-primary': colors.textPrimary,
  '--polis-color-text-muted': colors.textMuted,
  '--polis-color-border': colors.border,
  '--polis-color-success': colors.success,
  '--polis-color-warning': colors.warning,
  '--polis-color-danger': colors.danger,
  '--polis-color-info': colors.info,
});

/**
 * Maps the scheme-independent portion of a `PolisTheme` (fonts, radius,
 * spacing) to CSS custom properties.
 */
const staticTokenMap = (theme: PolisTheme): Record<string, string> => ({
  '--polis-font-body': theme.fonts.body,
  '--polis-font-heading': theme.fonts.heading,
  '--polis-font-mono': theme.fonts.mono,

  '--polis-radius-sm': theme.radius.sm,
  '--polis-radius-md': theme.radius.md,
  '--polis-radius-lg': theme.radius.lg,
  '--polis-radius-full': theme.radius.full,

  '--polis-spacing-xs': theme.spacing.xs,
  '--polis-spacing-sm': theme.spacing.sm,
  '--polis-spacing-md': theme.spacing.md,
  '--polis-spacing-lg': theme.spacing.lg,
  '--polis-spacing-xl': theme.spacing.xl,
});

/** Pick the token set matching the resolved scheme, falling back to light. */
const tokensForScheme = (theme: PolisTheme, resolved: ResolvedColorScheme): PolisColorTokens =>
  resolved === 'dark' ? (theme.dark ?? theme.colors) : theme.colors;

/**
 * Top-level theming provider for Polis-family apps.
 *
 * Responsibilities:
 *  1. Injects all `PolisTheme` tokens as CSS custom properties on
 *     `document.documentElement` so SCSS rules (`var(--polis-color-primary)`)
 *     and inline styles can read them. The colour tokens follow the active
 *     colour scheme (light vs the theme's `dark` set); fonts/radius/spacing
 *     are scheme-independent. Properties are removed on unmount so theme
 *     swaps stay clean.
 *  2. Tracks the colour-scheme preference (`'light' | 'dark' | 'system'`),
 *     persists it to localStorage, honours `prefers-color-scheme` for
 *     `'system'` (reacting to OS changes), and applies the framework-native
 *     dark attributes (`data-mantine-color-scheme`, `data-bs-theme`) plus a
 *     generic `data-polis-color-scheme` hook on the root element.
 *  3. Wraps children in `<MantineProvider>` with the theme's optional
 *     `mantineTheme` override and the resolved colour scheme so Mantine
 *     components render dark correctly.
 *  4. Exposes the active `PolisTheme` (`usePolisTheme`) and the colour-scheme
 *     controls (`useColorScheme`) via React context.
 */
export const PolisProvider: React.FC<PolisProviderProps> = ({
  theme,
  defaultAppliedColorScheme,
  colorScheme: controlledColorScheme,
  onColorSchemeChange,
  defaultColorScheme,
  forceColorScheme,
  children,
}) => {
  // Seed the initial preference: stored value wins, then explicit defaults,
  // then the legacy `defaultColorScheme` prop, then `'system'`.
  const seedScheme = (): PolisColorScheme => {
    if (forceColorScheme) return forceColorScheme;
    if (controlledColorScheme) return controlledColorScheme;
    const stored = readStoredColorScheme();
    if (stored) return stored;
    if (defaultAppliedColorScheme) return defaultAppliedColorScheme;
    if (defaultColorScheme === 'light' || defaultColorScheme === 'dark') return defaultColorScheme;
    return 'system';
  };

  const [uncontrolledScheme, setUncontrolledScheme] = useState<PolisColorScheme>(seedScheme);
  const colorScheme = forceColorScheme ?? controlledColorScheme ?? uncontrolledScheme;

  // Track the live OS preference so `'system'` reacts to changes.
  const [systemScheme, setSystemScheme] = useState<ResolvedColorScheme>(getSystemColorScheme);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemScheme(e.matches ? 'dark' : 'light');
    // Safari <14 uses addListener/removeListener.
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else mql.removeListener(handler);
    };
  }, []);

  const resolvedColorScheme: ResolvedColorScheme =
    colorScheme === 'system' ? systemScheme : colorScheme;

  const setColorScheme = useCallback(
    (next: PolisColorScheme) => {
      onColorSchemeChange?.(next);
      if (controlledColorScheme === undefined && !forceColorScheme) {
        writeStoredColorScheme(next);
        setUncontrolledScheme(next);
      }
    },
    [controlledColorScheme, forceColorScheme, onColorSchemeChange],
  );

  const toggleColorScheme = useCallback(() => {
    setColorScheme(resolvedColorScheme === 'dark' ? 'light' : 'dark');
  }, [resolvedColorScheme, setColorScheme]);

  // Apply the framework-native + generic scheme attributes as early as
  // possible (useEffect runs after paint, but for the very first paint the
  // FOUC-avoidance snippet — see `getColorSchemeInitScript` — should have
  // already set these in the HTML head).
  useEffect(() => {
    applyColorSchemeToDocument(resolvedColorScheme);
  }, [resolvedColorScheme]);

  // Inject the colour tokens for the resolved scheme.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const tokens = colorTokenMap(tokensForScheme(theme, resolvedColorScheme));
    const previousValues: Record<string, string> = {};
    Object.entries(tokens).forEach(([prop, value]) => {
      previousValues[prop] = root.style.getPropertyValue(prop);
      root.style.setProperty(prop, value);
    });
    return () => {
      Object.entries(previousValues).forEach(([prop, prev]) => {
        if (prev) root.style.setProperty(prop, prev);
        else root.style.removeProperty(prop);
      });
    };
  }, [theme, resolvedColorScheme]);

  // Inject the scheme-independent tokens (fonts / radius / spacing).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const tokens = staticTokenMap(theme);
    const previousValues: Record<string, string> = {};
    Object.entries(tokens).forEach(([prop, value]) => {
      previousValues[prop] = root.style.getPropertyValue(prop);
      root.style.setProperty(prop, value);
    });
    return () => {
      Object.entries(previousValues).forEach(([prop, prev]) => {
        if (prev) root.style.setProperty(prop, prev);
        else root.style.removeProperty(prop);
      });
    };
  }, [theme]);

  const colorSchemeContextValue = useMemo(
    () => ({ colorScheme, resolvedColorScheme, setColorScheme, toggleColorScheme }),
    [colorScheme, resolvedColorScheme, setColorScheme, toggleColorScheme],
  );

  return (
    <ColorSchemeContext.Provider value={colorSchemeContextValue}>
      <MantineProvider theme={theme.mantineTheme} forceColorScheme={resolvedColorScheme}>
        <PolisThemeContext.Provider value={theme}>{children}</PolisThemeContext.Provider>
      </MantineProvider>
    </ColorSchemeContext.Provider>
  );
};

/**
 * Read the active `PolisTheme` from React context. Used by components that
 * need token values in JS (inline styles, props that don't go through CSS).
 *
 * Returns the fallback theme if called outside of `<PolisProvider>` — see
 * `FALLBACK_POLIS_THEME` for the values.
 */
export const usePolisTheme = (): PolisTheme => useContext(PolisThemeContext);

export default PolisProvider;
