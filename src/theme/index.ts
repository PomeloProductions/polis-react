/**
 * JS barrel for `@polis/react/theme`.
 *
 * NOTE: the `.scss` files in this directory remain accessible via the
 * package's `./theme/*` SCSS export pattern in `package.json`. This barrel
 * exposes only the JS / TS surface (interface + context defaults).
 */
export type { PolisTheme, PolisColorTokens } from './PolisTheme';
export { PolisThemeContext, FALLBACK_POLIS_THEME } from './PolisThemeContext';
export {
  ColorSchemeContext,
  useColorScheme,
  useColorMode,
  getSystemColorScheme,
  resolveColorScheme,
  readStoredColorScheme,
  writeStoredColorScheme,
  applyColorSchemeToDocument,
  getColorSchemeInitScript,
  COLOR_SCHEME_STORAGE_KEY,
  POLIS_COLOR_SCHEME_ATTR,
  MANTINE_COLOR_SCHEME_ATTR,
  BOOTSTRAP_COLOR_SCHEME_ATTR,
} from './colorScheme';
export type { PolisColorScheme, ResolvedColorScheme, ColorSchemeContextValue } from './colorScheme';
