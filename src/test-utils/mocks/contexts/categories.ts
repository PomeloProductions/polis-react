import React from 'react';
import { CategoriesContextState } from '../../../contexts/CategoriesContext';
import Category from '../../../models/category';
import { mockCategory } from '../models/category';
import { createBaseMockContextState } from './base';

// Mock CategoriesContext
export const mockCategoriesContextValue = {
    ...createBaseMockContextState<Category>([
        mockCategory({ id: 1, name: 'Test Category', can_be_primary: true })
    ])
};

export const mockCategoriesContextValueLoading = {
    ...createBaseMockContextState<Category>([]),
    initialLoadComplete: false,
    isLoading: true
};

export const mockCategoriesContextValueEmpty = {
    ...createBaseMockContextState<Category>([]),
    noResults: true
};

// Mock CategoriesContext
jest.mock('../../../contexts/CategoriesContext', () => ({
    __esModule: true,
    CategoriesContext: React.createContext<CategoriesContextState>(mockCategoriesContextValue)
})); 