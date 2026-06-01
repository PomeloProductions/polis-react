import React, { useState, useEffect } from 'react';
import './index.scss';
import Collection from '../../../models/user/collection';

interface CollectionFormProps {
  onSubmit: (data: { name: string; isPublic: boolean }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  initialValues?: Collection;
  isEditing?: boolean;
}

const CollectionForm: React.FC<CollectionFormProps> = ({ 
  onSubmit, 
  onCancel,
  isSubmitting = false,
  error = null,
  initialValues,
  isEditing = false
}) => {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Initialize form with initial values if provided
  useEffect(() => {
    if (initialValues) {
      setName(initialValues.name || '');
      setIsPublic(initialValues.is_public || false);
    }
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, isPublic });
  };

  return (
    <form className="collection-form" onSubmit={handleSubmit}>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="form-group">
        <label htmlFor="collection-name">Collection Name</label>
        <input
          id="collection-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter collection name"
          required
          disabled={isSubmitting}
          className="form-control"
        />
      </div>

      <div className="form-group checkbox-label">
        <input
          id="collection-public"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          disabled={isSubmitting}
        />
        <label htmlFor="collection-public">
          Make this collection public
        </label>
      </div>

      <div className="form-actions">
        <button 
          type="button" 
          className="cancel-button" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="submit-button"
          disabled={isSubmitting}
          data-testid="submit-button"
        >
          {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Collection' : 'Create Collection')}
        </button>
      </div>
    </form>
  );
};

export default CollectionForm; 