import type { MantineThemeOverride } from '@mantine/core';

/**
 * Colour tokens for a single colour scheme (light or dark).
 *
 * A `PolisTheme` always provides one of these under `colors` (the light /
 * default set) and MAY provide a second under `dark` for dark mode. When a
 * theme omits `dark`, dark mode falls back to the light `colors` set so
 * light-only themes keep working unchanged.
 */
export interface PolisColorTokens {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  /** Light variant of primary (Mantine palette shade fallback). */
  primaryTint: string;
  /** Even lighter variant of primary (subtle backgrounds, hover hints). */
  primarySubtle: string;
  /** Text/icon color on primary backgrounds (typically white). */
  primaryContrast: string;
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
}

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
 * ## Dark mode
 *
 * A theme expresses dark mode by supplying a second `PolisColorTokens` set
 * under `dark`. `<PolisProvider>` tracks the active colour scheme
 * (`'light' | 'dark' | 'system'`, persisted to localStorage) and injects
 * whichever token set matches the *resolved* scheme, while also flipping the
 * framework-native dark attributes (`data-mantine-color-scheme` for Mantine,
 * `data-bs-theme` for Bootstrap 5.3) and a generic `data-polis-color-scheme`
 * hook on the root element.
 *
 * Backward compatibility: `dark` is optional. Themes that ship only `colors`
 * still satisfy the interface and render their light palette in every scheme.
 *
 * Adding a new token? Add it to `PolisColorTokens`, populate the
 * CSS-variable injection in `PolisProvider`, and update both
 * `@polis/theme-bootstrap` and `@polis/theme-mantine` so all themes satisfy
 * the interface (in both their light `colors` and `dark` sets).
 */
export interface PolisTheme {
  /** Theme identifier, e.g. `'bootstrap'`, `'mantine'`. */
  name: string;

  /** Light / default colour tokens. Always present. */
  colors: PolisColorTokens;

  /**
   * Dark colour tokens. Optional — when omitted, `<PolisProvider>` uses the
   * light `colors` set for dark mode as well, so light-only themes keep
   * working.
   */
  dark?: PolisColorTokens;

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
