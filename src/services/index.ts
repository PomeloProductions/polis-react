/**
 * Barrel for `@polis/react/services`.
 *
 * Exposes the configured `api` axios instance, AuthManager helpers, and
 * the per-resource request classes.
 */
export { default as api, dedupedGet } from './api';
export * from './AuthManager';
export { default as AuthRequests } from './requests/AuthRequests';
export type { LoginReq, SignUpData } from './requests/AuthRequests';
export { default as ResetPasswordRequests } from './requests/ResetPasswordRequests';
