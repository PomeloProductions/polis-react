import {
    BasePaginatedContextState,
    defaultBaseContext,
    prepareContextState,
} from './BasePaginatedContext';
import React, {PropsWithChildren, useState} from 'react';
import Category from "../models/category";

/**
 * The state interface for our state
 */
export interface CategoriesContextState extends BasePaginatedContextState<Category> {}

/**
 * This lets us persist the loaded state across multiple instances of the provider
 */
const persistentStateRef = { current: createDefaultState() };

function createDefaultState(): CategoriesContextState {
    return {
        ...defaultBaseContext(),
        loadAll: true,
        expands: [],
        limit: 100,
    }
}

/**
 * The actual context component
 */
export const CategoriesContext = React.createContext<CategoriesContextState>(createDefaultState());

export const CategoriesContextProvider: React.FC<PropsWithChildren> = (props => {

    const [categoriesState, setCategoriesState] = useState(persistentStateRef.current);

    const fullContext = {
        ...categoriesState,
        ...prepareContextState(setCategoriesState, categoriesState, '/categories')
    }

    return (
        <CategoriesContext.Provider value={fullContext}>
            <CategoriesContext.Consumer>
                {context => {
                    persistentStateRef.current = context
                    return props.children
                }}
            </CategoriesContext.Consumer>
        </CategoriesContext.Provider>
    )
}); 