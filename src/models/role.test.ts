import { AvailableRoles, SUPER_ADMIN_ROLE_ID } from './role';
import { isSuperAdmin } from './user/user';
import User from './user/user';

describe('SUPER_ADMIN_ROLE_ID', () => {
  test('is the SuperAdmin role id (2)', () => {
    expect(SUPER_ADMIN_ROLE_ID).toBe(2);
    expect(SUPER_ADMIN_ROLE_ID).toBe(AvailableRoles.SuperAdmin);
  });
});

describe('isSuperAdmin', () => {
  test('true when the user has the SuperAdmin role', () => {
    const user = { roles: [{ id: SUPER_ADMIN_ROLE_ID, name: 'Super' }] } as User;
    expect(isSuperAdmin(user)).toBe(true);
  });

  test('false when the user lacks the SuperAdmin role', () => {
    const user = { roles: [{ id: AvailableRoles.AppUser, name: 'User' }] } as User;
    expect(isSuperAdmin(user)).toBe(false);
  });

  test('false (not throwing) for null / undefined / no roles', () => {
    expect(isSuperAdmin(null)).toBe(false);
    expect(isSuperAdmin(undefined)).toBe(false);
    expect(isSuperAdmin({} as User)).toBe(false);
  });
});
