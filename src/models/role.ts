import BaseModel from './base-model';

export enum AvailableRoles {
    AppUser = 1,
    SuperAdmin = 2,
    ArticleViewer = 3,
    ArticleEditor = 4,
    Administrator = 10,
    Manager = 11,
    ContentEditor = 100,
    SupportStaff = 101
}

export default interface Role extends BaseModel {
    name: string;
    description?: string;
}

export const placeholderRole = (): Role => ({
    name: ''
});

export function getRoleName(id: number): string
{
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
