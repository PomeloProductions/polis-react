import React from 'react';

// Mock Page component
jest.mock('../../components/Template/Page', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children)
}));

// Mock ag-grid components
jest.mock('ag-grid-react', () => ({
    AgGridReact: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
    AgGridColumn: () => null
}));

// Mock FontAwesome
jest.mock('@fortawesome/react-fontawesome', () => ({
    FontAwesomeIcon: () => null
})); 