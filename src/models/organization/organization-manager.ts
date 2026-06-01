import BaseModel from '../base-model';
import Organization from './organization';
import User from '../user/user';

/**
 * Our Organization Manager details
 */
export default interface OrganizationManager extends BaseModel {

    /**
     * The organization model this relates to if loaded
     */
    organization: Organization;

    /**
     * The related user
     */
    user?: User;

    /**
     * The id of the organization this is related to
     */
    organization_id: number;

    /**
     * The related role
     */
    role_id: number;

    /**
     * the id of the user
     */
    user_id: number;

    /**
     * The contact email of the organization manager
     */
    contact_email?: string;

    /**
     * The contact phone of the organization manager
     */
    contact_phone?: string;
}

export const placeholderOrganizationManager = (): OrganizationManager => ({
    organization_id: 0,
    role_id: 0,
    user_id: 0,
    organization: {} as Organization,
});
