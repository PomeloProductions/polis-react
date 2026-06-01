import React from 'react';
import {UserCollectionsContextState} from '../../../../contexts/UserCollectionsContext';
import {
    CollectionItemsContext,
    CollectionItemsContextState
} from '../../../../contexts/CollectionItemsContext';
import Collection from '../../../../models/user/collection';
import CollectionCard from './CollectionCard';
import './index.scss';

interface MyCollectionsContentProps {
    collectionsContext: UserCollectionsContextState;
    onEditCollection?: (collection: Collection) => void;
}

const MyCollectionsContent: React.FC<MyCollectionsContentProps> = ({
    collectionsContext,
    onEditCollection
}) => {
    const {loadedData: collections, refreshing: isLoading} = collectionsContext;

    if (isLoading) {
        return <div className="loading">Loading collections...</div>;
    }

    if (!collections || collections.length === 0) {
        return (
            <div className="no-collections">
                <p>You don't have any collections yet.</p>
            </div>
        );
    }

    const handleEditClick = (collection: Collection) => {
        if (onEditCollection) {
            onEditCollection(collection);
        }
    };

    const getCollectionItemsCount = (collectionId: number, collectionItemsContext: CollectionItemsContextState): number => {
        if (!collectionId) return 0;
        return collectionItemsContext[collectionId]?.total || 0;
    };

    return (
        <CollectionItemsContext.Consumer>
            {(collectionItemsContext) => (
                <div className="collections-grid" data-testid="collections-grid">
                    {collections.map((collection: Collection) => (
                        <CollectionCard
                            key={collection.id}
                            collection={collection}
                            itemCount={getCollectionItemsCount(collection.id!, collectionItemsContext)}
                            onEditClick={onEditCollection ? () => handleEditClick(collection) : undefined}
                        />
                    ))}
                </div>
            )}
        </CollectionItemsContext.Consumer>
    );
};

export default MyCollectionsContent; 