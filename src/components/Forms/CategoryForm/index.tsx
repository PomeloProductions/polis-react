import React, { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import Category from '../../../models/category';
import './index.scss';

interface FormData {
    name: string;
    description: string;
    can_be_primary: boolean;
}

interface CategoryFormProps {
    category?: Category;
    onSubmit: (values: FormData) => Promise<void>;
    isSubmitting: boolean;
    submitError: string | null;
    onCancel: () => void;
    mode: 'create' | 'edit';
}

const CategoryForm: React.FC<CategoryFormProps> = ({
    category,
    onSubmit,
    isSubmitting,
    submitError,
    onCancel,
    mode
}) => {
    const [values, setValues] = useState<FormData>({
        name: category?.name || '',
        description: category?.description || '',
        can_be_primary: category?.can_be_primary || false
    });

    // Update form values when category changes
    useEffect(() => {
        if (category) {
            setValues({
                name: category.name || '',
                description: category.description || '',
                can_be_primary: category.can_be_primary || false
            });
        }
    }, [category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSubmit(values);
        } catch (error) {
            console.error('Form submission error:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setValues(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setValues(prev => ({
            ...prev,
            [name]: checked
        }));
    };

    return (
        <Form onSubmit={handleSubmit} className="category-form" role="form">
            <Form.Group className="mb-3">
                <Form.Label htmlFor="name">Name</Form.Label>
                <Form.Control
                    id="name"
                    type="text"
                    name="name"
                    value={values.name}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                />
            </Form.Group>
            
            <Form.Group className="mb-3">
                <Form.Label htmlFor="description">Description</Form.Label>
                <Form.Control
                    id="description"
                    as="textarea"
                    name="description"
                    value={values.description}
                    onChange={handleInputChange}
                    rows={3}
                    disabled={isSubmitting}
                />
            </Form.Group>
            
            <Form.Group className="mb-3">
                <Form.Check
                    id="can_be_primary"
                    type="checkbox"
                    name="can_be_primary"
                    label="Can be primary category"
                    checked={values.can_be_primary}
                    onChange={handleCheckboxChange}
                    disabled={isSubmitting}
                />
            </Form.Group>

            {submitError && (
                <div className="error-message mb-3">
                    {submitError}
                </div>
            )}
            
            <div className="button-group">
                <Button 
                    variant="secondary" 
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
                </Button>
            </div>
        </Form>
    );
};

export default CategoryForm; 