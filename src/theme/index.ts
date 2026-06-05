/**
 * JS barrel for `@polis/react/theme`.
 *
 * NOTE: the `.scss` files in this directory remain accessible via the
 * package's `./theme/*` SCSS export pattern in `package.json`. This barrel
 * exposes only the JS / TS surface (interface + context defaults).
 */
export type { PolisTheme } from './PolisTheme';
export { PolisThemeContext, FALLBACK_POLIS_THEME } from './PolisThemeContext';
