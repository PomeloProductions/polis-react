import BaseModel from './base-model';

/**
 * A model that has a type field
 */
export interface HasType extends BaseModel {
    /**
     * The type of the model
     */
    type: string;
} 