import React, { useContext, useEffect } from 'react';
import { MantineProvider } from '@mantine/core';
import { PolisThemeContext } from '../../theme/PolisThemeContext';
import type { PolisTheme } from '../../theme/PolisTheme';

interface PolisProviderProps {
  theme: PolisTheme;
  children: React.ReactNode;
}

/**
 * Maps a `PolisTheme` object to the `--polis-*` CSS custom property names
 * we expose to SCSS. Centralised so the SCSS fallback list (in the audit)
 * and the runtime injection stay in lockstep.
 */
const tokenMap = (theme: PolisTheme): Record<string, string> => ({
  '--polis-color-primary': theme.colors.primary,
  '--polis-color-primary-hover': theme.colors.primaryHover,
  '--polis-color-primary-active': theme.colors.primaryActive,
  '--polis-color-primary-tint': theme.colors.primaryTint,
  '--polis-color-primary-subtle': theme.colors.primarySubtle,
  '--polis-color-primary-contrast': theme.colors.primaryContrast,
  '--polis-color-surface': theme.colors.surface,
  '--polis-color-surface-alt': theme.colors.surfaceAlt,
  '--polis-color-text-primary': theme.colors.textPrimary,
  '--polis-color-text-muted': theme.colors.textMuted,
  '--polis-color-border': theme.colors.border,
  '--polis-color-success': theme.colors.success,
  '--polis-color-warning': theme.colors.warning,
  '--polis-color-danger': theme.colors.danger,
  '--polis-color-info': theme.colors.info,

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

/**
 * Top-level theming provider for Polis-family apps.
 *
 * Responsibilities:
 *  1. Injects all `PolisTheme` tokens as CSS custom properties on
 *     `document.documentElement` so SCSS rules (`var(--polis-color-primary)`)
 *     and inline styles can read them. Properties are removed on unmount /
 *     before re-applying so theme swaps are clean.
 *  2. Wraps children in `<MantineProvider>` with the theme's optional
 *     `mantineTheme` override so Mantine components pick up the same
 *     palette / typography / radius defaults.
 *  3. Exposes the active `PolisTheme` via React context for components
 *     that need JS access (see `usePolisTheme`).
 */
export const PolisProvider: React.FC<PolisProviderProps> = ({ theme, children }) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const tokens = tokenMap(theme);
    const previousValues: Record<string, string> = {};

    Object.entries(tokens).forEach(([prop, value]) => {
      previousValues[prop] = root.style.getPropertyValue(prop);
      root.style.setProperty(prop, value);
    });

    return () => {
      Object.entries(previousValues).forEach(([prop, prev]) => {
        if (prev) {
          root.style.setProperty(prop, prev);
        } else {
          root.style.removeProperty(prop);
        }
      });
    };
  }, [theme]);

  return (
    <MantineProvider theme={theme.mantineTheme}>
      <PolisThemeContext.Provider value={theme}>{children}</PolisThemeContext.Provider>
    </MantineProvider>
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
