import React, {useState, useEffect, forwardRef, useMemo} from 'react';
import { Autocomplete, Loader } from '@mantine/core';
import { CategoriesContext, CategoriesContextProvider, CategoriesContextState } from '../../../contexts/CategoriesContext';
import Category from '../../../models/category';
import CategoryRequests from '../../../services/requests/CategoryRequests';
import './index.scss';

interface CategoryAutocompleteProps {
    onSelect: (category: Category) => void;
    prioritizedCategories?: Category[];
    placeholder?: string;
    label?: string;
    required?: boolean;
}

// Subcomponent that receives the context as a prop
interface CategoryAutocompleteContentProps extends CategoryAutocompleteProps {
    context: CategoriesContextState;
}

const CategoryAutocompleteContent = forwardRef<{ clearInput: () => void }, CategoryAutocompleteContentProps>(({
    onSelect,
    prioritizedCategories ,
    placeholder = 'Search categories...',
    label,
    required = false,
    context
}, ref) => {
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<Category[]>([]);

    // Expose clearInput method through ref
    React.useImperativeHandle(ref, () => ({
        clearInput: () => setSearchValue('')
    }));

    // Use the context to search for categories
    const setInput = (search: string) => {
        setSearchValue(search)
        if (!search.trim()) {
            setOptions([]);
            return;
        }

        setLoading(true);
        context.setSearch('name', search);
    };

    // Create a map of prioritized category IDs for quick lookup
    const prioritizedIds = useMemo(() => new Set((prioritizedCategories ?? []).map(cat => cat.id)), [prioritizedCategories]);

    // Create a map to track unique category names (case-insensitive)
    const uniqueNames = useMemo(() => {
        const newUniqueNames = new Map<string, Category>();
        if (prioritizedCategories) {
            // First add prioritized categories
            prioritizedCategories.forEach(cat => {
                newUniqueNames.set(cat.name.toLowerCase(), cat);
            });

            // Then add search results, preserving prioritized categories
            const results = context.loadedData || [];
            results.forEach((cat: Category) => {
                const lowerName = cat.name.toLowerCase();
                if (!newUniqueNames.has(lowerName)) {
                    newUniqueNames.set(lowerName, cat);
                }
            });

        }
        return newUniqueNames;
    }, [prioritizedCategories, context.loadedData])

    useEffect(() => {
        // Convert back to array and sort
        const uniqueResults = Array.from(uniqueNames.values());
        const sortedResults = uniqueResults.sort((a: Category, b: Category) => {
            const aIsPrioritized = prioritizedIds.has(a.id);
            const bIsPrioritized = prioritizedIds.has(b.id);
            
            if (aIsPrioritized && !bIsPrioritized) return -1;
            if (!aIsPrioritized && bIsPrioritized) return 1;
            return 0;
        });

        // Add the search term as a potential new category if it doesn't exist
        const searchTermExists = uniqueNames.has(searchValue.toLowerCase());

        if (!searchTermExists && searchValue.trim()) {
            setOptions([
                ...sortedResults,
                { id: -1, name: searchValue } as Category // Temporary ID for new category
            ]);
        } else {
            setOptions(sortedResults);
        }
        setLoading(false);
    }, [searchValue, uniqueNames, prioritizedIds]);

    const handleSelect = async (selectedValue: string) => {
        if (!selectedValue) {
            return; // Don't call onSelect with null
        }

        // Find if the selected value matches an existing category
        const existingCategory = options.find(cat => 
            cat.name.toLowerCase() === selectedValue.toLowerCase()
        );

        if (existingCategory && existingCategory.id !== -1) {
            onSelect(existingCategory);
        } else {
            // Create a new category
            try {
                const newCategory = await CategoryRequests.createCategory(selectedValue);
                onSelect(newCategory);
            } catch (error) {
                console.error('Error creating category:', error);
                // If creation fails, we don't call onSelect at all
            }
        }
    };

    // Format options for the Autocomplete component
    const formattedOptions = options.map(cat => cat.name);

    return (
        <Autocomplete
            value={searchValue}
            onChange={setInput}
            onOptionSubmit={handleSelect}
            data={formattedOptions}
            placeholder={placeholder}
            label={label}
            required={required}
            rightSection={loading ? <Loader size="xs" /> : null}
            comboboxProps={{ 
                withinPortal: true,
                position: "bottom",
                middlewares: { flip: false, shift: false }
            }}
            limit={10}
            clearable
            styles={{
                dropdown: {
                    zIndex: 1000
                }
            }}
        />
    );
});

// Main component that provides the context to the subcomponent
const CategoryAutocomplete = forwardRef<{ clearInput: () => void }, CategoryAutocompleteProps>((props, ref) => {
    return (
        <CategoriesContextProvider>
            <CategoriesContext.Consumer>
                {context => <CategoryAutocompleteContent {...props} context={context} ref={ref} />}
            </CategoriesContext.Consumer>
        </CategoriesContextProvider>
    );
});

export default CategoryAutocomplete; 