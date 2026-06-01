import BaseModel from './base-model';

export default interface Page<T> {
    /**
     * All entries within this page
     */
    data: T[];

    /**
     * The total amount of data
     */
    total: number;

    /**
     * What page we are currently on
     */
    current_page: number;

    /**
     * The last page of all results
     */
    last_page: number;

    /**
     * How many items per page
     */
    per_page: number;
}

export function createDummyPage<Model>() : Page<Model>{
    return {
        current_page: 0,
        last_page: 0,
        total: 0,
        data: [],
        per_page: 0,
    }
}

/**
 * Merges all of the data together
 * @param page
 * @param existingEntries
 */
export function mergePageData<M extends BaseModel>(page: Page<M>, existingEntries: M[]): M[]
{
    const data = page.data;
    data.forEach(entry => {
        const index = existingEntries.findIndex(i => i.id === entry.id);
        if (index !== -1) {
            existingEntries[index] = entry;
        } else {
            existingEntries.push(entry);
        }
    });
    return existingEntries;
}
