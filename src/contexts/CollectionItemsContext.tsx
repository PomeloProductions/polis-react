import {
  BasePaginatedContextProviderProps,
  BasePaginatedContextState,
  defaultBaseContext,
  prepareContextState,
} from './BasePaginatedContext';
import React, { PropsWithChildren, useEffect, useState } from 'react';
import CollectionItem from '../models/user/collection-items';

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
export const CollectionItemsContext =
  React.createContext<CollectionItemsContextState>(createDefaultState());

export interface CollectionItemsContextProviderProps extends BasePaginatedContextProviderProps {
  collectionIds: number[];
  skipCache?: boolean;
}

export const CollectionItemsContextProvider: React.FC<
  PropsWithChildren<CollectionItemsContextProviderProps>
> = ({ collectionIds, skipCache, children }) => {
  // Initialize state from the global persistent state
  const [collectionItemsState, setCollectionItemsState] = useState<CollectionItemsContextState>(
    () => {
      // If skipCache is true, start with a fresh state
      if (skipCache) {
        return createDefaultState();
      }

      // Otherwise, use the global persistent state
      return { ...globalPersistentState };
    },
  );

  // Callers typically pass a fresh array literal each render, so key the
  // effect on the VALUE of the ids. Depending on the state object itself (or
  // setting state unconditionally) re-triggers the effect on every commit --
  // that was an infinite update loop.
  const collectionIdsKey = collectionIds.join(',');

  useEffect(() => {
    setCollectionItemsState((prevState) => {
      const newState = { ...prevState };

      collectionIds.forEach((collectionId) => {
        if (!newState[collectionId]) {
          // Initialize state for this collection if it doesn't exist
          newState[collectionId] = {
            ...defaultBaseContext<CollectionItem>(),
            expands: ['item', 'collectionItemCategories', 'collectionItemCategories.category'],
            loadAll: true,
            order: {
              created_at: 'desc',
            },
            limit: 50,
            loadedData: [],
          };
        }

        // Prepare the context state for this collection
        const collectionState = prepareContextState(
          (state) => {
            // Functional update: the closure must not capture a stale
            // snapshot of the surrounding state
            setCollectionItemsState((prev) => ({
              ...prev,
              [collectionId]: state as CollectionItemContextState,
            }));

            // Update the global persistent state
            if (!skipCache) {
              globalPersistentState[collectionId] = state as CollectionItemContextState;
            }
          },
          newState[collectionId],
          '/collections/' + collectionId + '/items',
        );

        newState[collectionId] = collectionState;
      });

      // Update the global persistent state
      if (!skipCache) {
        Object.keys(newState).forEach((key) => {
          const parsedId = parseInt(key, 10);
          if (!isNaN(parsedId)) {
            globalPersistentState[parsedId] = newState[parsedId];
          }
        });
      }

      return newState;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionIdsKey, skipCache]);

  return (
    <CollectionItemsContext.Provider value={collectionItemsState}>
      {children}
    </CollectionItemsContext.Provider>
  );
};
