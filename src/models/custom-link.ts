import BaseModel from './base-model';

/**
 * Our data wrapper for a custom link
 */
export default interface CustomLink extends BaseModel {

    /**
     * The url for the link
     */
    url: string;

    /**
     * The label for the link
     */
    label: string;
}
