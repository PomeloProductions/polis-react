import BaseEntityModel from '../entities/base-entity-model';

/**
 * Our Organization details
 */
export default interface Organization extends BaseEntityModel {

    /**
     * The description of the organization
     */
    description?: string;
}

/**
 * Gets an organization that we can use throughout the app if we need to load the organization
 */
export const placeholderOrganization = (): Organization => ({
    name: '',
    email: ''
});
