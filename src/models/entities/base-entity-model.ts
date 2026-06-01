import BaseModel from '../base-model';

/**
 * Base interface for entities that have common fields like name, email, and profile image
 */
export default interface BaseEntityModel extends BaseModel {
    /**
     * The name of the entity
     */
    name: string;

    /**
     * The email address of the entity
     */
    email: string;

    /**
     * The URL to the profile image
     */
    profile_image_url?: string;
} 