/**
 * @polis/react — shared toolkit for Polis-family apps.
 *
 * This top-level barrel exports only the parts that are **standalone** today
 * — i.e. consumable without bringing along PolisOS's Redux store and SCSS
 * theme. Deeper bits live behind their own paths:
 *
 *   - `@polis/react/services/api`         (Redux-coupled; needs migration)
 *   - `@polis/react/contexts/MeContext`   (Redux-coupled; needs migration)
 *   - `@polis/react/components/AuthenticatedRoute`  (Redux-coupled)
 *   - `@polis/react/components/Template/Page`       (Bootstrap-coupled)
 *
 * Whether to decouple those in this package or wire Redux into consumers is
 * an open architectural choice — see CLAUDE.md.
 *
 * The consuming app's Vite must support `.scss` imports. Add `sass` to
 * devDependencies if it isn't already there.
 */

// ───── Pure components ─────
export { default as ApplicationLogo } from './components/ApplicationLogo';
export { default as BottomStickySection } from './components/BottomStickySection';
export { default as Footnote } from './components/Footnote';
export { default as InputWrapper } from './components/InputWrapper';
export { default as LoadingScreen } from './components/LoadingScreen';
export { default as NetworkError } from './components/Errors/NetworkError';

// ───── Util helpers ─────
export {
  ellipsisText,
  grammaticalList,
  addHttpPrefix,
  convertHexColorToBrightness,
  initialize,
} from './util/strings';

export {
  isIOS,
  isAndroid,
  isChrome,
  isSafari,
  isFirefox,
  isEdge,
  isTouchDevice,
  hasMouse,
  isBot,
} from './util/platform';

export {
  emailRegExp,
  phoneRegExp,
  zipRegExp,
  stateRegExp,
  urlRegExp,
  validateRegexMatch,
} from './util/regex';
