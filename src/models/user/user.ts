import BaseEntityModel from '../entities/base-entity-model';
import Organization from '../organization/organization';
import Role, { AvailableRoles } from '../role';
import Category from '../category';
import OrganizationManager from '../organization/organization-manager';

/**
 * Our user interface
 */
export default interface User extends BaseEntityModel {
  /**
   * The full name of the user
   */
  full_name: string;

  /**
   * The first name the user entered upon sign up
   */
  first_name: string;

  /**
   * The last name the user entered upon sign up
   */
  last_name: string;

  /**
   * The phone number if set
   */
  phone?: string;

  /**
   * The birthday without any formatting
   */
  birthday?: string;

  /**
   * The gender they user entered, either M F or O
   */
  gender?: string;

  /**
   * The zip code entered
   */
  zip_code?: string;

  /**
   * This is the user bio information
   */
  about_me: string;

  /**
   * The amount of invites that have been accepted for this user
   */
  accepted_invites: number;

  /**
   * The date for when the user
   */
  website_registered_at?: string;

  /**
   * Whether other users can find this user
   */
  allow_users_to_find_me: boolean;

  /**
   * Whether other users can add this user
   */
  allow_users_to_add_me: boolean;

  /**
   * Time format preference: '12h' or '24h'
   */
  time_format?: '12h' | '24h';

  /**
   * All roles that the user has attached to their account
   */
  roles?: Array<Role>;

  /**
   * The organization managers
   */
  organization_managers?: OrganizationManager[];

  /**
   * All categories this user is following
   */
  followed_categories?: Category[];
}

function canUserFillRole(user: User, role: AvailableRoles): boolean {
  return user.roles ? user.roles.find((i) => i.id === role) !== undefined : false;
}

/**
 * Tells us whether the user can create full businesses
 * @param user
 */
export function canUserCreateBusiness(user: User): boolean {
  return isSuperUser(user) || canUserFillRole(user, AvailableRoles.Administrator);
}

/**
 * Whether the user is a superuser
 * @param user
 */
export function isSuperUser(user: User): boolean {
  return canUserFillRole(user, AvailableRoles.SuperAdmin);
}

/**
 * The subset of `User` the null-safe UI role-gates read. Lets callers pass a
 * partially-loaded `me` (e.g. `Pick<User, 'roles' | 'organization_managers'>`)
 * rather than a full user model.
 */
export type UserRoleScope = Pick<User, 'roles' | 'organization_managers'>;

/**
 * Whether the user is an app-level super admin. Unlike {@link isSuperUser},
 * this null-safe variant accepts `null` / `undefined` so it can gate UI
 * directly from a possibly-unloaded `me`. Requires `me.roles` to be populated
 * (fetch with `AuthRequests.getMeWithOrganizations`, which expands `roles`).
 * @param user the current user, or null/undefined if not loaded
 */
export function isSuperAdmin(user: Pick<User, 'roles'> | null | undefined): boolean {
  return !!user?.roles?.some((role) => role.id === AvailableRoles.SuperAdmin);
}

/**
 * tells us whether there is a bisection between the user, the organization, and the roles passed through
 * @param user
 * @param organization
 * @param roles
 */
export function canFillRole(
  user: User,
  organization: Organization,
  roles: AvailableRoles[],
): boolean {
  roles.push(AvailableRoles.Administrator);
  const relatedOrganizationManagers =
    user.organization_managers?.filter((i) => i.organization_id === organization.id) ?? [];

  return (
    isSuperUser(user) ||
    relatedOrganizationManagers.find((i) => roles.indexOf(i.role_id) !== -1) !== undefined
  );
}

/**
 * Whether the user can manage the given organization at all — i.e. is a
 * super admin, or is an organization manager of that org in any role
 * (ADMINISTRATOR or MANAGER). Null-safe so it can gate UI directly from a
 * possibly-unloaded `me`. Requires `me.roles` + `me.organization_managers`
 * to be populated (fetch via `AuthRequests.getMeWithOrganizations`).
 *
 * @param user the current user, or null/undefined if not loaded
 * @param organizationId the organization to check management of
 */
export function canManageOrganization(
  user: UserRoleScope | null | undefined,
  organizationId: number,
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return !!user.organization_managers?.some((m) => m.organization_id === organizationId);
}

/**
 * Whether the user can invite/remove members of the given organization. Only
 * super admins and ADMINISTRATORs of that org may manage membership; plain
 * MANAGERs may not. Null-safe. Requires `me.roles` +
 * `me.organization_managers` (fetch via `AuthRequests.getMeWithOrganizations`).
 *
 * @param user the current user, or null/undefined if not loaded
 * @param organizationId the organization to check invite rights for
 */
export function canInviteMembers(
  user: UserRoleScope | null | undefined,
  organizationId: number,
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return !!user.organization_managers?.some(
    (m) => m.organization_id === organizationId && m.role_id === AvailableRoles.Administrator,
  );
}

/**
 * The distinct set of organization ids the user manages. Super admins may see
 * any org (callers should check `isSuperAdmin` first); everyone else is scoped
 * to the orgs returned here. Null-safe.
 *
 * @param user the current user, or null/undefined if not loaded
 */
export function managedOrganizationIds(
  user: Pick<User, 'organization_managers'> | null | undefined,
): number[] {
  if (!user?.organization_managers) return [];
  const ids = new Set<number>();
  for (const m of user.organization_managers) {
    if (m.organization_id != null) ids.add(m.organization_id);
  }
  return Array.from(ids);
}

/**
 * Formats the user gender properly
 * @param user
 */
export function formatUserGender(user: User): string {
  switch (user.gender) {
    case 'M':
      return 'Male';

    case 'F':
      return 'Female';

    default:
      return '';
  }
}

/**
 * Formats the phone number properly to be read in the US
 * @param user
 */
export function formatUserPhoneNumber(user: User): string {
  return user.phone
    ? '(' + user.phone.substr(0, 3) + ') ' + user.phone.substr(3, 3) + '-' + user.phone.substr(6)
    : '';
}

/**
 * Creates a placeholder user to handle our default logged in user state
 */
export const placeholderUser = (): User => ({
  name: '',
  email: '',
  first_name: '',
  last_name: '',
  full_name: '',
  about_me: '',
  allow_users_to_find_me: true,
  allow_users_to_add_me: true,
  accepted_invites: 0,
});

/**
 * The name of the user to display
 */
export function userName(user: User): string {
  if (user.website_registered_at) {
    return user.full_name;
  }

  return 'Unregistered User';
}
