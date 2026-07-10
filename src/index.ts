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

// ───── Settings forms (presentational, behavior via onSubmit) ─────
export { default as ChangePasswordForm } from './components/Forms/ChangePasswordForm';
export type {
  ChangePasswordFormProps,
  ChangePasswordValues,
} from './components/Forms/ChangePasswordForm';
export { default as OrganizationForm } from './components/Forms/OrganizationForm';
export type {
  OrganizationFormProps,
  OrganizationValues,
} from './components/Forms/OrganizationForm';

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

// ───── Settings pages (drop-in account/organization settings) ─────
export { default as SettingsPage } from './pages/Settings/SettingsPage';
// `SettingsLayout` is an alias for the same drop-in composition.
export { default as SettingsLayout } from './pages/Settings/SettingsPage';
export type { SettingsPageProps } from './pages/Settings/SettingsPage';
export { default as AccountPage } from './pages/Settings/AccountPage';
// `AccountSettings` is an alias for `AccountPage`.
export { default as AccountSettings } from './pages/Settings/AccountPage';
export type { AccountPageProps } from './pages/Settings/AccountPage';
export { default as MyOrganizationPage } from './pages/Settings/MyOrganizationPage';
// `OrganizationSettings` is an alias for `MyOrganizationPage`.
export { default as OrganizationSettings } from './pages/Settings/MyOrganizationPage';
export type { MyOrganizationPageProps } from './pages/Settings/MyOrganizationPage';
export { default as OrganizationsAdminPage } from './pages/Settings/OrganizationsAdminPage';
export type { OrganizationsAdminPageProps } from './pages/Settings/OrganizationsAdminPage';

// ───── Settings request helpers + role gating ─────
export { default as OrganizationRequests } from './services/requests/OrganizationRequests';
export type {
  OrganizationPayload,
  ListOrganizationsParams,
} from './services/requests/OrganizationRequests';
export { isSuperAdmin, isSuperUser } from './models/user/user';
export { SUPER_ADMIN_ROLE_ID, AvailableRoles } from './models/role';
export type { default as Organization } from './models/organization/organization';
export type { default as OrganizationManager } from './models/organization/organization-manager';

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

export { parseApiError, firstFieldErrors } from './util/api-errors';
export type { FieldErrors, ParsedApiError } from './util/api-errors';

// ───── Generic node-tree framework (domain-agnostic) ─────
export { default as NodeTreeRenderer } from './components/NodeTreeRenderer';
export type {
  NodeTreeRendererProps,
  NodeRenderArgs,
  NodeRenderDelegate,
} from './components/NodeTreeRenderer';
export { createComponentRegistry, defaultComponentRegistry } from './components/ComponentRegistry';
export type {
  ComponentRegistry,
  ComponentProps,
  RegisterableComponent,
} from './components/ComponentRegistry';
export {
  getNodeAtPath,
  updateNodeAtPath,
  removeNodeAtPath,
  addChildAtPath,
  findNodeById,
  removeChildAtPath,
  moveNode,
  moveChildAtPath,
  nestNodeInto,
  makeId,
} from './util/node-tree-utils';
export type { TreeNode, NodePath } from './util/node-tree-utils';
export { createPageTypeRegistry, defaultPageTypeRegistry } from './util/page-type-registry';
export type { PageTypeRegistry, PageTypeConfig, PageTypeContext } from './util/page-type-registry';

/*
 * Stateful core modules. These carry module-level state (the AppContext
 * store bridge, the shared axios instance, the Me context) and MUST be
 * imported through this barrel: consumers deep-importing them by subpath
 * while package-internal code imports them relatively can end up with two
 * module instances under dev servers that mix optimized and raw source
 * (e.g. Vite), splitting appState across copies and breaking auth.
 */
export { AppContext, AppContextProvider, appState } from './data/AppContext';
export { MeContext, clearMeState, default as MeContextProvider } from './contexts/MeContext';
export { default as api, dedupedGet } from './services/api';
export { default as AuthRequests } from './services/requests/AuthRequests';
export { setTokenData, logOut } from './data/persistent/persistent.actions';
