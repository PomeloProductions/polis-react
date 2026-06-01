import React, {useState} from 'react';
import User from '../../../models/user/user';
import {
    UserCollectionsContext,
    UserCollectionsContextProvider,
    UserCollectionsContextState
} from '../../../contexts/UserCollectionsContext';
import {
    CollectionItemsContextProvider
} from '../../../contexts/CollectionItemsContext';
import MyCollectionsContent from './MyCollectionsContent';
import ContentModal from '../../GeneralUIElements/Modal';
import CollectionForm from '../../Forms/CollectionForm';
import CollectionManagementRequests from '../../../services/requests/CollectionManagementRequests';
import Collection from '../../../models/user/collection';
import './index.scss';

interface MyCollectionsProps {
    user: User;
}


const MyCollections: React.FC<MyCollectionsProps> = ({user}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

    if (!user?.id) {
        return null;
    }

    const handleCreateCollection = async (
        data: { name: string; isPublic: boolean },
        collectionsContext: UserCollectionsContextState
    ) => {
        if (!user.id) return;

        setIsCreating(true);
        setError(null);

        try {
            // Create the collection using the request service
            const newCollection = await CollectionManagementRequests.createCollection(user.id, {
                name: data.name,
                is_public: data.isPublic
            });

            // Add the model to the context
            collectionsContext.addModel(newCollection);

            // Close the modal
            setIsModalOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create collection');
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditCollection = (collection: Collection) => {
        setEditingCollection(collection);
        setIsModalOpen(true);
    };

    const handleUpdateCollection = async (
        data: { name: string; isPublic: boolean },
        collectionsContext: UserCollectionsContextState
    ) => {
        if (!editingCollection) return;

        setIsCreating(true);
        setError(null);

        try {
            // Update the collection using the request service
            const updatedCollection = await CollectionManagementRequests.updateCollection(editingCollection, {
                name: data.name,
                is_public: data.isPublic
            });

            // Update the model in the context using addModel (which handles both adding and updating)
            collectionsContext.addModel(updatedCollection);

            // Close the modal and reset editing state
            setIsModalOpen(false);
            setEditingCollection(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update collection');
        } finally {
            setIsCreating(false);
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingCollection(null);
    };

    return (
        <UserCollectionsContextProvider userId={user.id}>
            <UserCollectionsContext.Consumer>
                {(collectionsContext: UserCollectionsContextState) => (

                    <div className="my-collections">
                        <div className="my-collections-header">
                            <h2>My Collections</h2>
                            <button
                                className="create-collection-button"
                                onClick={() => setIsModalOpen(true)}
                            >
                                Create Collection
                            </button>
                        </div>


                        <CollectionItemsContextProvider collectionIds={collectionsContext.loadedData.map(i => i.id!)}>
                            <MyCollectionsContent
                                collectionsContext={collectionsContext}
                                onEditCollection={handleEditCollection}
                            />
                        </CollectionItemsContextProvider>

                        <ContentModal
                            isOpen={isModalOpen}
                            onRequestClose={handleModalClose}
                            title={editingCollection ? "Edit Collection" : "Create New Collection"}
                        >
                            <CollectionForm
                                onSubmit={(data) => editingCollection
                                    ? handleUpdateCollection(data, collectionsContext)
                                    : handleCreateCollection(data, collectionsContext)
                                }
                                onCancel={handleModalClose}
                                isSubmitting={isCreating}
                                error={error}
                                initialValues={editingCollection || undefined}
                                isEditing={!!editingCollection}
                            />
                        </ContentModal>
                    </div>
                )}
            </UserCollectionsContext.Consumer>
        </UserCollectionsContextProvider>
    );
};

export default MyCollections; 