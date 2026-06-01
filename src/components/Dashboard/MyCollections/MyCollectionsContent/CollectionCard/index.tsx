import React from 'react';
import { Link } from 'react-router-dom';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import Collection from '../../../../../models/user/collection';
import './index.scss';

interface CollectionCardProps {
    collection: Collection;
    itemCount: number;
    onEditClick?: (e: React.MouseEvent, collection: Collection) => void;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
    collection,
    itemCount,
    onEditClick
}) => {
    const handleEditClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onEditClick) {
            onEditClick(e, collection);
        }
    };

    return (
        <div className="collection-card-container">
            <Link
                to={`/collections/${collection.id}`}
                className="collection-card"
            >
                <div className="collection-card-header">
                    <h3>{collection.name}</h3>
                    {onEditClick && (
                        <Tooltip label="Edit collection" position="top" withArrow>
                            <ActionIcon
                                variant="subtle"
                                color="blue"
                                className="edit-collection-button"
                                onClick={handleEditClick}
                                aria-label={`Edit ${collection.name}`}
                            >
                                <IconEdit size={16}/>
                            </ActionIcon>
                        </Tooltip>
                    )}
                </div>
                <p>{itemCount}</p>
            </Link>
        </div>
    );
};

export default CollectionCard; 