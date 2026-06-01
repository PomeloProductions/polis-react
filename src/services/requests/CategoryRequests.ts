import api from '../api';
import Page from '../../models/page';
import Category from '../../models/category';

export default class CategoryRequests {

    /**
     * Searches for a category based on the passed in name
     * @param name
     * @return Category[]
     */
    static async searchCategories(name: string): Promise<Category[]> {
        const { data } = await api.get('/categories', {
            params: {
                'search[name]': 'like,*' + name + '*',
            }
        });
        return (data as Page<Category>).data;
    }

    /**
     * Gets a category based on the passed in ID
     * @param id
     * @return Category
     */
    static async getCategory(id: number): Promise<Category> {
        const { data } = await api.get('/categories/' + id);
        return data as Category;
    }

    /**
     * Creates a category for us properly
     * @param name
     */
    static async createCategory(name: string): Promise<Category> {
        const { data } = await api.post('/categories ', {
            name: name,
        });
        return data as Category;
    }

    /**
     * Updates an existing category
     * @param id - The category ID
     * @param categoryData - The updated category data
     * @returns Promise with the updated category data
     */
    static async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category> {
        const { data } = await api.put(`/categories/${id}`, categoryData);
        return data as Category;
    }

    /**
     * Deletes a category by ID
     * @param id - The category ID
     * @returns Promise that resolves when the category is deleted
     */
    static async deleteCategory(id: number): Promise<void> {
        await api.delete(`/categories/${id}`);
    }
}
