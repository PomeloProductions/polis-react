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

// ───── Theming ─────
export { PolisProvider, usePolisTheme } from './components/PolisProvider';
export { PolisThemeContext, FALLBACK_POLIS_THEME } from './theme/PolisThemeContext';
export type { PolisTheme } from './theme/PolisTheme';

// ───── Pure components ─────
export { default as ApplicationLogo } from './components/ApplicationLogo';
export { default as BottomStickySection } from './components/BottomStickySection';
export { default as Footnote } from './components/Footnote';
export { default as InputWrapper } from './components/InputWrapper';
export { default as LoadingScreen } from './components/LoadingScreen';
export { default as NetworkError } from './components/Errors/NetworkError';

// ───── Auth forms (render-prop pattern) ─────
export { default as SignInForm } from './components/Forms/SignInForm';
export { default as SignUpForm } from './components/Forms/SignUpForm';
export type { SignUpFormProps, SignUpValues } from './components/Forms/SignUpForm';
export { default as ForgotPasswordForm } from './components/Forms/ForgotPasswordForm';
export type {
  ForgotPasswordFormProps,
  ForgotPasswordValues,
} from './components/Forms/ForgotPasswordForm';
export { default as ResetPasswordForm } from './components/Forms/ResetPasswordForm';
export type {
  ResetPasswordFormProps,
  ResetPasswordValues,
} from './components/Forms/ResetPasswordForm';

// ───── Default page compositions ─────
export { default as SignInPage } from './pages/Auth/SignInPage';
export type { SignInPageProps, AuthPageBranding } from './pages/Auth/SignInPage';
export { default as SignUpPage } from './pages/Auth/SignUpPage';
export type { SignUpPageProps } from './pages/Auth/SignUpPage';
export { default as ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
export type { ForgotPasswordPageProps } from './pages/Auth/ForgotPasswordPage';
export { default as ResetPasswordPage } from './pages/Auth/ResetPasswordPage';
export type { ResetPasswordPageProps } from './pages/Auth/ResetPasswordPage';
export { default as WelcomePage } from './pages/Welcome';
export type { WelcomePageProps } from './pages/Welcome';
export { default as DashboardPage } from './pages/Dashboard';
export type { DashboardPageProps } from './pages/Dashboard';

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
