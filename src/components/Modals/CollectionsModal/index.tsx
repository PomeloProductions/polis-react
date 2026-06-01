import React, { useState, useEffect } from 'react';
import { Stack, TextInput } from '@mantine/core';
import { CollectionItemsContext } from '../../../contexts/CollectionItemsContext';
import Collection from '../../../models/user/collection';
import './index.scss';
import { HasType } from '../../../models/has-type';
import ContentModal, { ModalProps } from '../../GeneralUIElements/Modal';
import CollectionItemComponent from './CollectionItem';

interface CollectionsModalProps extends ModalProps {
    items: HasType | Set<HasType>;
    collections: Collection[];
    isLoading?: boolean;
}

const CollectionsModal: React.FC<CollectionsModalProps> = ({ 
    isOpen,
    onRequestClose,
    items,
    collections,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCollections, setFilteredCollections] = useState<Collection[]>(collections);
    const isBulkOperation = items instanceof Set;

    useEffect(() => {
        if (searchQuery) {
            const filtered = collections.filter(collection => 
                collection.name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredCollections(filtered);
        } else {
            setFilteredCollections(collections);
        }
    }, [searchQuery, collections]);

    // Get the first item for display purposes, ensuring we have a valid item
    const firstItem = isBulkOperation 
        ? (items as Set<HasType>).size > 0 
            ? (items as Set<HasType>).values().next().value 
            : { id: 0, type: 'unknown' } as HasType
        : items;

    // If we don't have a valid item, don't render the modal content
    if (!firstItem) {
        return null;
    }

    const modalTitle = isBulkOperation 
        ? `Collections for ${(items as Set<HasType>).size} Items`
        : `Collections for ${firstItem.type.charAt(0).toUpperCase() + firstItem.type.slice(1)}`;

    return (
        <ContentModal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            title={modalTitle}
        >
            <CollectionItemsContext.Consumer>
                {(collectionItemsContext) => (
                    <div className="collections-modal-content">
                        <h3>Your Collections</h3>
                        <Stack>
                            <TextInput
                                placeholder="Search collections..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <ul className="collections-list">
                                {filteredCollections.map(collection => (
                                    <CollectionItemComponent
                                        key={collection.id}
                                        collection={collection}
                                        item={firstItem}
                                        collectionItemsContext={collectionItemsContext}
                                        isBulkOperation={isBulkOperation}
                                        selectedItems={isBulkOperation ? items as Set<HasType> : undefined}
                                    />
                                ))}
                            </ul>
                        </Stack>
                    </div>
                )}
            </CollectionItemsContext.Consumer>
        </ContentModal>
    );
};

export default CollectionsModal; 