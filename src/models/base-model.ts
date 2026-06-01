/**
 * The base model interface that all models should extend
 */
export default interface BaseModel {
    /**
     * The id of the model
     */
    id?: number;

    /**
     * When the model was created
     */
    created_at?: string;

    /**
     * When the model was last updated
     */
    updated_at?: string;
}

/**
 * Filters out all non-unique models based on id
 * @param models
 */
export function filterUnique<Type extends BaseModel>(models: Type[]) : Type[] {
    return models
        .filter((value, index, self) => self.findIndex(v => v.id === value.id) === index);
}
