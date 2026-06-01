import React, {PropsWithChildren, useCallback, useEffect, useState} from 'react';
import Collection, {collectionPlaceholder} from "../models/user/collection";
import CollectionManagementRequests from "../services/requests/CollectionManagementRequests";
import LoadingScreen from "../components/LoadingScreen";

let cachedCollections = [] as Collection[];
/**
 * The state interface for our state
 */
export interface CollectionContextConsumerState {
    hasLoaded: boolean,
    notFound: boolean,
    collection: Collection,
    setCollection: (collection: Collection) => void,
}

let defaultContext: CollectionContextConsumerState = {
    hasLoaded: false,
    notFound: false,
    collection: collectionPlaceholder,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setCollection: (_collection: Collection) => {}
};

/**
 * The actual context component
 */
export const CollectionContext = React.createContext<CollectionContextConsumerState>(defaultContext);

export interface CollectionContextProviderProps {
    collectionId: number
    skipCache?: boolean
}

export const CollectionContextProvider: React.FC<PropsWithChildren<CollectionContextProviderProps>> = ({collectionId, skipCache, children}) => {
    const [collectionState, setCollectionState] = useState(defaultContext);

    const setCollection = useCallback((newCollection: Collection): void => {
        cachedCollections[newCollection.id!] = {...newCollection};
        setCollectionState(prevState => ({
            ...prevState,
            collection: newCollection,
        }));
    }, []);

    useEffect(() => {
        if (!skipCache && cachedCollections[collectionId]) {
            setCollectionState({
                hasLoaded: true,
                notFound: false,
                collection: cachedCollections[collectionId],
                setCollection: setCollection,
            });
        } else {
            setCollectionState(prevState => ({
                ...prevState,
                hasLoaded: false,
                setCollection: setCollection,
            }));
            CollectionManagementRequests.getCollection(collectionId).then(apiCollection => {
                cachedCollections[collectionId] = apiCollection;
                setCollectionState(prevState => ({
                    ...prevState,
                    hasLoaded: true,
                    notFound: false,
                    collection: apiCollection,
                    setCollection: setCollection,
                }));
            }).catch(() => {
                setCollectionState(prevState => ({
                    ...prevState,
                    hasLoaded: true,
                    notFound: true,
                    setCollection: setCollection,
                }));
            })
        }
    }, [collectionId, skipCache, setCollection]);


    return (
        <CollectionContext.Provider value={{...collectionState, setCollection}}>
            <CollectionContext.Consumer>
                {context => (context.hasLoaded ?
                    (!context.notFound ? children :
                            <div className={'post-not-found'}>
                                <h2>This collection has been deleted</h2>
                            </div>
                    ) : <LoadingScreen/>
                )}
            </CollectionContext.Consumer>
        </CollectionContext.Provider>
    )
}
