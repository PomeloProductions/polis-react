import BaseModel from './base-model';
import User from './user/user';

/**
 * The interface for what our resource will look like
 */
export default interface Resource<Model> extends BaseModel {

    /**
     * The content that will be searched on this resource
     */
    content: string;

    /**
     * The id of the main resource
     */
    resource_id: number;

    /**
     * The type of resource
     */
    resource_type: string;

    /**
     * How relevant the resource is
     */
    relevance: number;

    /**
     * The actual model
     */
    resource: Model;
}

export type ResourceTypes = User
