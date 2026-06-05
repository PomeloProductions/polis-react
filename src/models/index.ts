/**
 * Barrel for `@polis/react/models`.
 *
 * Re-exports the user-facing model interfaces. Granular submodule paths
 * (`@polis/react/models/user/user`) remain available.
 */
export type { default as User } from './user/user';
export { placeholderUser } from './user/user';
export type { default as Category } from './category';
export type { default as Role, AvailableRoles } from './role';
export type { default as Asset } from './asset';
export type { default as Page } from './page';
export type { default as Resource } from './resource';
export type { RequestError } from './request-error';
export type { default as CustomLink } from './custom-link';
export type { HasType } from './has-type';
export type { default as BaseModel } from './base-model';
