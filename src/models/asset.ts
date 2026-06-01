import BaseModel from './base-model';
import {AvailableEntityTypes, Entity} from './entities';

/**
 * The details of our asset model
 */
export default interface Asset extends BaseModel {

    /**
     * The url for the asset
     */
    url: string;

    /**
     * The id of the owner of this asset
     */
    owner_id?: number;

    /**
     * The type of entity this is
     */
    owner_type?: AvailableEntityTypes;

    /**
     * The actual model for the owner of this asset if it exists
     */
    owner?: Entity;

    /**
     * The asset name if it is set
     */
    name?: string;

    /**
     * The asset caption if it is set
     */
    caption?: string;
}