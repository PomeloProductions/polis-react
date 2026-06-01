import React from 'react';

// Import all request mocks for jest.mock
import { mockAuthRequests } from './auth-requests';
import { mockCategoryRequests } from './category-requests';
import { mockCollectionManagementRequests } from './collection-management-requests';
import { mockOrganizationRequests } from './organization-requests';
import { mockUserRequests } from './user-requests';

// Mock Page component
jest.mock('../../../components/Template/Page', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => React.createElement('div', { className: 'page' }, children)
}));

// Export all request mocks
export { mockAuthRequests } from './auth-requests';
export { mockCategoryRequests } from './category-requests';
export { mockCollectionManagementRequests } from './collection-management-requests';
export { mockOrganizationRequests } from './organization-requests';
export { mockUserRequests } from './user-requests';

// Mock all request services
jest.mock('../../../services/requests/AuthRequests', () => ({
    __esModule: true,
    default: mockAuthRequests,
    ...mockAuthRequests
}));

jest.mock('../../../services/requests/CategoryRequests', () => ({
    __esModule: true,
    default: mockCategoryRequests,
    ...mockCategoryRequests
}));

jest.mock('../../../services/requests/CollectionManagementRequests', () => ({
    __esModule: true,
    default: mockCollectionManagementRequests,
    ...mockCollectionManagementRequests
}));

jest.mock('../../../services/requests/OrganizationRequests', () => ({
    __esModule: true,
    default: mockOrganizationRequests,
    ...mockOrganizationRequests
}));

jest.mock('../../../services/requests/UserRequests', () => ({
    __esModule: true,
    default: mockUserRequests,
    ...mockUserRequests
})); 