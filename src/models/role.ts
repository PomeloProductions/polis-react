import BaseModel from './base-model';

export enum AvailableRoles {
  AppUser = 1,
  SuperAdmin = 2,
  ArticleViewer = 3,
  ArticleEditor = 4,
  Administrator = 10,
  Manager = 11,
  ContentEditor = 100,
  SupportStaff = 101,
}

export default interface Role extends BaseModel {
  name: string;
  description?: string;
}

/**
 * The `SUPER_ADMIN` role id from polis-laravel (`Polis\Models\Role::SUPER_ADMIN`).
 * Roles are keyed by numeric id, not slug — SUPER_ADMIN is 2 (an alias of
 * {@link AvailableRoles.SuperAdmin}). Used to gate the super-admin-only
 * Organizations management section in the Settings scaffolding.
 */
export const SUPER_ADMIN_ROLE_ID: number = AvailableRoles.SuperAdmin;

export const placeholderRole = (): Role => ({
  name: '',
});

export function getRoleName(id: number): string {
  switch (id) {
    case AvailableRoles.Administrator:
      return 'Owner';

    case AvailableRoles.Manager:
      return 'Manager';

    default:
      return 'Unknown Role';
  }
}

export function getRoleDescription(roleId: number): string {
  switch (roleId) {
    case AvailableRoles.Administrator:
      return 'Access to Billing, Add/Delete users, location activity results, Edit location details, Post ads';

    case AvailableRoles.Manager:
      return 'Access to location activity results, Edit location details, Post ads';
  }
  return '';
}
