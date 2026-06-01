import {
    BasePaginatedContextProviderProps,
    BasePaginatedContextState, createCallbacks,
    defaultBaseContext, prepareContextState,
} from './BasePaginatedContext';
import React, {PropsWithChildren, useEffect, useState} from 'react';
import Collection from "../models/user/collection";

/**
 * The state interface for our state
 */
export interface UserCollectionsContextState extends BasePaginatedContextState<Collection> {}

/**
 * This lets us persist the loaded state across multiple instances of the provider
 */
let persistentContext = createDefaultState();

function createDefaultState(): UserCollectionsContextState {
    return {
        ...defaultBaseContext(),
        loadAll: true,
        order: {
            'created_at': 'desc',
        },
        limit: 50,
    }
}

/**
 * The actual context component
 */
export const UserCollectionsContext = React.createContext<UserCollectionsContextState>(createDefaultState());

export interface UserCollectionsContextProviderProps extends BasePaginatedContextProviderProps{
    userId: number,
}

export const UserCollectionsContextProvider: React.FC<PropsWithChildren<UserCollectionsContextProviderProps>> = (props => {
    const [userCollectionsState, setUserCollectionsState] = useState(persistentContext);
    useEffect(() => {
        prepareContextState(setUserCollectionsState, userCollectionsState, '/users/' + props.userId + '/collections')
    }, [props.userId, userCollectionsState]);

    const fullContext = {
        ...persistentContext,
        ...createCallbacks(setUserCollectionsState, persistentContext, '/users/' + props.userId + '/collections')
    }

    return (
        <UserCollectionsContext.Provider value={fullContext}>
            {props.children}
        </UserCollectionsContext.Provider>
    )
});
