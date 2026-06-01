import {
    BasePaginatedContextProviderProps,
    BasePaginatedContextState,
    defaultBaseContext, prepareContextState,
} from './BasePaginatedContext';
import React, {PropsWithChildren, useEffect, useState, useRef} from 'react';
import CollectionItem from "../models/user/collection-items";

export interface CollectionItemContextState extends BasePaginatedContextState<CollectionItem> {}

/**
 * The state interface for our state
 */
export interface CollectionItemsContextState {
    [collectionId: number]: CollectionItemContextState;
}

// Global persistent state that survives across component unmounts and remounts
const globalPersistentState: CollectionItemsContextState = {};

function createDefaultState(): CollectionItemsContextState {
    return {};
}

/**
 * The actual context component
 */
export const CollectionItemsContext = React.createContext<CollectionItemsContextState>(createDefaultState());

export interface CollectionItemsContextProviderProps extends BasePaginatedContextProviderProps {
    collectionIds: number[];
    skipCache?: boolean;
}

export const CollectionItemsContextProvider: React.FC<PropsWithChildren<CollectionItemsContextProviderProps>> = ({collectionIds, skipCache, children}) => {
    // Use a ref to track if this is the first render
    const isFirstRender = useRef(true);
    
    // Initialize state from the global persistent state
    const [collectionItemsState, setCollectionItemsState] = useState<CollectionItemsContextState>(() => {
        // If skipCache is true, start with a fresh state
        if (skipCache) {
            return createDefaultState();
        }
        
        // Otherwise, use the global persistent state
        return { ...globalPersistentState };
    });

    useEffect(() => {
        // Create a new state object with all collection states
        const newState = { ...collectionItemsState };
        
        collectionIds.forEach(collectionId => {
            if (!newState[collectionId]) {
                // Initialize state for this collection if it doesn't exist
                newState[collectionId] = {
                    ...defaultBaseContext<CollectionItem>(),
                    expands: [
                        'item',
                        'collectionItemCategories',
                        'collectionItemCategories.category',
                    ],
                    loadAll: true,
                    order: {
                        'created_at': 'desc',
                    },
                    limit: 50,
                    loadedData: [],
                };
            }
            
            // Prepare the context state for this collection
            const collectionState = prepareContextState(
                (state) => {
                    // Update both the local state and the global persistent state
                    const updatedState = {
                        ...collectionItemsState,
                        [collectionId]: state as CollectionItemContextState
                    };
                    
                    setCollectionItemsState(updatedState);
                    
                    // Update the global persistent state
                    if (!skipCache) {
                        globalPersistentState[collectionId] = state as CollectionItemContextState;
                    }
                },
                newState[collectionId],
                '/collections/' + collectionId + '/items'
            );
            
            newState[collectionId] = collectionState;
        });

        setCollectionItemsState({...newState});
        // Only update the state on first render or when collectionIds change
        if (isFirstRender.current || collectionIds.length > 0) {
            
            // Update the global persistent state
            if (!skipCache) {
                Object.keys(newState).forEach(key => {
                    const collectionId = parseInt(key, 10);
                    if (!isNaN(collectionId)) {
                        globalPersistentState[collectionId] = newState[collectionId];
                    }
                });
            }
            
            isFirstRender.current = false;
        }
    }, [collectionIds, collectionItemsState, skipCache]); // Re-run when dependencies change

    return (
        <CollectionItemsContext.Provider value={collectionItemsState}>
            {children}
        </CollectionItemsContext.Provider>
    );
};
