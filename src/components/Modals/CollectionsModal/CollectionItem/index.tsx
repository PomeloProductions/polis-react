import React, { useState, useRef, useMemo } from 'react';
import { Button, Stack, Text, ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import Collection from '../../../../models/user/collection';
import CollectionItem from '../../../../models/user/collection-items';
import CategoryAutocomplete from '../../../GeneralUIElements/CategoryAutocomplete';
import Category from '../../../../models/category';
import { CollectionItemCategory } from '../../../../models/user/collection-item-category';
import CollectionManagementRequests from '../../../../services/requests/CollectionManagementRequests';
import { CollectionItemsContextState } from '../../../../contexts/CollectionItemsContext';
import './index.scss';
import { HasType } from '../../../../models/has-type';
import { isInCollection } from '../../../../util/collection-utils';

// Function to add an item to a collection
const handleAddToCollection = async (
    item: HasType, 
    collection: Collection, 
    collectionItemsContext: CollectionItemsContextState,
    setLoadingCollectionId: (id: number | null) => void
): Promise<void> => {
    if (!item || !collection.id) return;
    
    setLoadingCollectionId(collection.id);
    
    try {
        // Create the collection item
        const collectionItemData = {
            item_id: item.id as number,
            item_type: 'user',
            order: 0
        } as Partial<CollectionItem>;
        
        const newCollectionItem = await CollectionManagementRequests.createCollectionItem(collection, collectionItemData);
        
        // Add the item to the collection items context
        const collectionState = collectionItemsContext[collection.id];
        if (collectionState) {
            collectionState.addModel(newCollectionItem);
        }
    } catch (error) {
        console.error('Error adding to collection:', error);
    } finally {
        setLoadingCollectionId(null);
    }
};

// Function to add multiple items to a collection
const handleBulkAddToCollection = async (
    items: HasType[],
    collection: Collection,
    collectionItemsContext: CollectionItemsContextState,
    setLoadingCollectionId: (id: number | null) => void
): Promise<void> => {
    if (!collection.id) return;
    
    setLoadingCollectionId(collection.id);
    
    try {
        // Create collection items for each item
        const collectionItemPromises = items.map(item => {
            const collectionItemData = {
                item_id: item.id as number,
                item_type: 'user',
                order: 0
            } as Partial<CollectionItem>;
            return CollectionManagementRequests.createCollectionItem(collection, collectionItemData);
        });

        const newCollectionItems = await Promise.all(collectionItemPromises);
        
        // Add all items to the collection items context
        const collectionState = collectionItemsContext[collection.id];
        if (collectionState) {
            newCollectionItems.forEach(item => collectionState.addModel(item));
        }
    } catch (error) {
        console.error('Error bulk adding to collection:', error);
    } finally {
        setLoadingCollectionId(null);
    }
};

// Function to remove an item from a collection
const handleRemoveFromCollection = async (
    item: HasType, 
    collection: Collection, 
    collectionItemsContext: CollectionItemsContextState,
    setLoadingCollectionId: (id: number | null) => void
): Promise<void> => {
    if (!item || !collection.id) return;
    
    setLoadingCollectionId(collection.id);
    
    try {
        const collectionState = collectionItemsContext[collection.id];
        if (!collectionState) return;

        const collectionItem = collectionState.loadedData?.find(
            (ci: CollectionItem) => ci.item_id === item.id
        );
        
        if (!collectionItem) {
            throw new Error('Collection item not found');
        }
        
        // Remove the collection item
        await CollectionManagementRequests.removeCollectionItem(collectionItem);
        
        // Remove the item from the collection items context
        collectionState.removeModel(collectionItem);
    } catch (error) {
        console.error('Error removing from collection:', error);
    } finally {
        setLoadingCollectionId(null);
    }
};

// Function to add a category to a collection item
const handleAddCategory = async (
    collectionItem: CollectionItem,
    category: Category,
    collectionItemsContext: CollectionItemsContextState
): Promise<void> => {
    if (!collectionItem || !category || !collectionItem.id || !category.id) return;

    try {
        const categoryData = {
            category_id: category.id,
            linked_at: new Date().toISOString().split('T')[0],
            linked_at_format: 'Y-m-d' as const
        };
        
        const newCollectionItemCategory = await CollectionManagementRequests.createCollectionItemCategory(
            collectionItem.id,
            categoryData
        );
        
        // Update the collection items context with the new category
        const collectionId = collectionItem.collection_id;
        if (collectionId && collectionItemsContext[collectionId]) {
            // Find the collection item in the context
            const collectionItems = collectionItemsContext[collectionId].loadedData || [];
            const itemIndex = collectionItems.findIndex((item: CollectionItem) => item.id === collectionItem.id);
            
            if (itemIndex !== -1) {
                // Create a copy of the collection item with the new category
                const updatedCollectionItem = { ...collectionItems[itemIndex] };
                
                // Initialize collection_item_categories if it doesn't exist
                if (!updatedCollectionItem.collection_item_categories) {
                    updatedCollectionItem.collection_item_categories = [];
                }
                
                // Add the new category to the collection item
                const categoryWithName = {
                    ...newCollectionItemCategory,
                    category: {
                        id: category.id,
                        name: category.name,
                        can_be_primary: category.can_be_primary,
                        created_at: category.created_at,
                        updated_at: category.updated_at
                    }
                };
                
                updatedCollectionItem.collection_item_categories.push(categoryWithName);
                
                // Update the collection item in the context
                collectionItemsContext[collectionId].addModel(updatedCollectionItem);
            }
        }
    } catch (error) {
        console.error('Error adding category:', error);
    } finally {
    }
};

// Function to remove a category from a collection item
const handleRemoveCategory = async (
    collection: Collection,
    collectionItemCategory: CollectionItemCategory,
    collectionItemsContext: CollectionItemsContextState
): Promise<void> => {
    if (!collectionItemCategory || !collectionItemCategory.id) return;

    try {
        await CollectionManagementRequests.deleteCollectionItemCategory(collectionItemCategory.id);
        
        // Update the collection items context by removing the category
        const collectionId = collection.id;
        if (collectionId && collectionItemsContext[collectionId]) {
            // Find the collection item in the context
            const collectionItems = collectionItemsContext[collectionId].loadedData || [];
            const itemIndex = collectionItems.findIndex((item: CollectionItem) => 
                item.id === collectionItemCategory.collection_item_id
            );
            
            if (itemIndex !== -1) {
                // Create a copy of the collection item
                const updatedCollectionItem = { ...collectionItems[itemIndex] };
                
                // Initialize collection_item_categories if it doesn't exist
                if (!updatedCollectionItem.collection_item_categories) {
                    updatedCollectionItem.collection_item_categories = [];
                }
                
                // Remove the category from the collection item
                updatedCollectionItem.collection_item_categories = updatedCollectionItem.collection_item_categories.filter(
                    (category: CollectionItemCategory) => category.id !== collectionItemCategory.id
                );
                
                // Update the collection item in the context
                collectionItemsContext[collectionId].addModel(updatedCollectionItem);
            }
        }
    } catch (error) {
        console.error('Error removing category:', error);
    } finally {
    }
};

interface CollectionItemProps {
    collection: Collection;
    item: HasType;
    collectionItemsContext: CollectionItemsContextState;
    isBulkOperation?: boolean;
    selectedItems?: Set<HasType>;
}

const CollectionItemComponent: React.FC<CollectionItemProps> = ({
    collection,
    item,
    collectionItemsContext,
    isBulkOperation = false,
    selectedItems
}) => {
    const [loadingCollectionId, setLoadingCollectionId] = useState<number | null>(null);
    const categoryAutocompleteRef = useRef<{ clearInput: () => void } | null>(null);

    const itemIsInCollection = useMemo((): boolean => {
        if (!collection.id) return false;
        return isInCollection(item, collection.id, collectionItemsContext);
    }, [collection.id, collectionItemsContext, item]);

    const collectionItem = collection.id && itemIsInCollection 
        ? collectionItemsContext[collection.id as keyof typeof collectionItemsContext]?.loadedData?.find(
            (ci: CollectionItem) => ci.item_id === item.id
        ) 
        : null;
    const categories = collectionItem?.collection_item_categories || [];

    // Get selected releases for bulk operation
    const selectedReleases = useMemo(() => {
        if (!isBulkOperation || !selectedItems || !collection.id) return [];
        const collectionState = collectionItemsContext[collection.id as keyof typeof collectionItemsContext];
        if (!collectionState) return [];
        // Get all items that are selected but not already in the collection
        const existingItemIds = new Set(collectionState.loadedData?.map((item: CollectionItem) => item.item_id) ?? []);
        return Array.from(selectedItems)
            .filter(item => item.id !== undefined && !existingItemIds.has(item.id));
    }, [isBulkOperation, selectedItems, collectionItemsContext, collection.id]);

    // Function to handle category selection
    const handleCategorySelect = async (category: Category) => {
        if (!collection.id) return;
        const collectionState = collectionItemsContext[collection.id as keyof typeof collectionItemsContext];
        if (!collectionState) return;

        const collectionItem = collectionState.loadedData?.find(
            (ci: CollectionItem) => ci.item_id === item.id && ci.item_type === item.type
        );

        if (collectionItem && category) {
            await handleAddCategory(
                collectionItem,
                category,
                collectionItemsContext
            );
            // Clear the CategoryAutocomplete input after successful addition
            if (categoryAutocompleteRef.current && typeof categoryAutocompleteRef.current.clearInput === 'function') {
                categoryAutocompleteRef.current.clearInput();
            }
        }
    };

    const handleCategoryRemove = async (category: CollectionItemCategory) => {
        await handleRemoveCategory(
            collection,
            category,
            collectionItemsContext
        );
    };

    return (
        <li className="collection-item">
            <Stack gap="xs">
                <div className="collection-info">
                    <div className="collection-name">{collection.name}</div>
                    <div className="collection-count">{collection.collection_items_count}</div>
                </div>
                
                {itemIsInCollection && collectionItem && collectionItem.id && (
                    <>
                        <div className="collection-categories">
                            <Text size="sm" fw={500} mb="xs">Categories:</Text>
                            {categories.length > 0 ? (
                                <ul className="collection-item-categories-list">
                                    {categories.map((category: CollectionItemCategory) => {
                                        return (
                                            <li key={category.id} className="category-item">
                                                <span className="category-name">{category.category.name}</span>
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="red"
                                                    size="sm"
                                                    onClick={() => handleCategoryRemove(category)}
                                                >
                                                    <IconTrash size={14} />
                                                </ActionIcon>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <Text size="sm" c="dimmed">No categories added</Text>
                            )}
                        </div>
                        
                        <CategoryAutocomplete
                            onSelect={handleCategorySelect}
                            ref={categoryAutocompleteRef}
                            prioritizedCategories={collectionItem?.collection_item_categories?.map((cic: CollectionItemCategory) => cic.category) || []}
                            placeholder="Add a category..."
                        />
                        
                        <Button
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => handleRemoveFromCollection(
                                item,
                                collection,
                                collectionItemsContext,
                                setLoadingCollectionId
                            )}
                            loading={loadingCollectionId === collection.id}
                        >
                            Remove from Collection
                        </Button>
                    </>
                )}
                
                {!itemIsInCollection && (
                    <Button
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={() => isBulkOperation && selectedItems
                            ? handleBulkAddToCollection(
                                selectedReleases,
                                collection,
                                collectionItemsContext,
                                setLoadingCollectionId
                            )
                            : handleAddToCollection(
                                item,
                                collection,
                                collectionItemsContext,
                                setLoadingCollectionId
                            )
                        }
                        loading={loadingCollectionId === collection.id}
                    >
                        {isBulkOperation ? `Add ${selectedReleases.length} Items` : 'Add to Collection'}
                    </Button>
                )}
            </Stack>
        </li>
    );
};

export default CollectionItemComponent; 