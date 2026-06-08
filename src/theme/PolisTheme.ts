import type { MantineThemeOverride } from '@mantine/core';

/**
 * Canonical token interface shared across `@polis/react` and the
 * `@polis/theme-*` packages.
 *
 * Themes export a `theme: PolisTheme` object. `<PolisProvider>` injects
 * these tokens as CSS custom properties on `document.documentElement` so
 * SCSS (`var(--polis-color-primary)`) and JS (`usePolisTheme()`) can read
 * them, and forwards `mantineTheme` to `<MantineProvider>` so Mantine
 * components pick up the theme as well.
 *
 * Adding a new token? Add it here, populate the CSS-variable injection in
 * `PolisProvider`, and update both `@polis/theme-bootstrap` and
 * `@polis/theme-mantine` so all themes satisfy the interface.
 */
export interface PolisTheme {
  /** Theme identifier, e.g. `'bootstrap'`, `'mantine'`. */
  name: string;

  colors: {
    primary: string;
    primaryHover: string;
    primaryActive: string;
    /** Background of cards / panels. */
    surface: string;
    /** Muted background (e.g. table-row hover, alt rows). */
    surfaceAlt: string;
    textPrimary: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };

  fonts: {
    body: string;
    heading: string;
    mono: string;
  };

  radius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };

  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  /**
   * Mantine-specific overrides that the theme wants to inject when the
   * consumer wraps in `<MantineProvider>`. Optional — themes that don't
   * override defaults can omit.
   */
  mantineTheme?: MantineThemeOverride;
}

export default PolisTheme;
