
export interface RequestError {
    /**
     * Any request errors will have this in the root that will represent the json body of the response
     */
    data: {
        /**
         * If there is an error with a specific field, this will then be set
         */
        errors?: {
            /**
             * The errors will have the key of the field it is related to with an array of related errors
             */
            [key: string] : string[],
        }
    },
}
