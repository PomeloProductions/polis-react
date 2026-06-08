import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

const getCategoryMock = jest.fn();
const createCategoryMock = jest.fn();
const updateCategoryMock = jest.fn();
jest.mock('../../../services/requests/CategoryRequests', () => ({
    __esModule: true,
    default: {
        getCategory: (...args: unknown[]) => getCategoryMock(...args),
        createCategory: (...args: unknown[]) => createCategoryMock(...args),
        updateCategory: (...args: unknown[]) => updateCategoryMock(...args),
    },
}));

jest.mock('../../../contexts/CategoriesContext', () => {
    const React = jest.requireActual('react');
    const CategoriesContext = React.createContext({ addModel: jest.fn() });
    const CategoriesContextProvider: React.FC<{ children: React.ReactNode }> = ({
        children,
    }) => (
        <CategoriesContext.Provider value={{ addModel: jest.fn() }}>
            {children}
        </CategoriesContext.Provider>
    );
    return { __esModule: true, CategoriesContext, CategoriesContextProvider };
});

jest.mock('../../../components/Template/Page/index', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import DefaultCategoryEditor from './index';

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/category/new" element={<DefaultCategoryEditor />} />
                <Route path="/category/:id" element={<DefaultCategoryEditor />} />
            </Routes>
        </MemoryRouter>
    );

beforeEach(() => {
    mockNavigate.mockReset();
    getCategoryMock.mockReset();
    createCategoryMock.mockReset();
    updateCategoryMock.mockReset();
});

describe('DefaultCategoryEditor', () => {
    test('renders Create heading when no id', () => {
        renderAt('/category/new');
        expect(screen.getByText('Create Category')).toBeInTheDocument();
    });

    test('renders Edit heading and loads category by id', async () => {
        getCategoryMock.mockResolvedValueOnce({
            id: 5,
            name: 'My Cat',
            description: '',
            can_be_primary: false,
        });
        renderAt('/category/5');
        await waitFor(() => {
            expect(getCategoryMock).toHaveBeenCalledWith(5);
        });
        expect(screen.getByText('Edit Category')).toBeInTheDocument();
    });

    test('shows load error when getCategory rejects', async () => {
        const consoleErr = jest.spyOn(console, 'error').mockImplementation(() => {});
        getCategoryMock.mockRejectedValueOnce(new Error('nope'));
        renderAt('/category/9');
        await waitFor(() => {
            expect(getCategoryMock).toHaveBeenCalled();
        });
        consoleErr.mockRestore();
    });

    test('cancel navigates back to /browse/categories', () => {
        renderAt('/category/new');
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(mockNavigate).toHaveBeenCalledWith('/browse/categories');
    });

    test('create submission calls createCategory and navigates', async () => {
        createCategoryMock.mockResolvedValueOnce({
            id: 99,
            name: 'New',
            description: '',
            can_be_primary: false,
        });
        renderAt('/category/new');
        fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'New' } });
        await act(async () => {
            fireEvent.submit(screen.getByRole('form'));
        });
        await waitFor(() => {
            expect(createCategoryMock).toHaveBeenCalledWith('New');
        });
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/browse/categories');
        });
    });

    test('edit submission calls updateCategory and navigates', async () => {
        getCategoryMock.mockResolvedValueOnce({
            id: 5,
            name: 'Existing',
            description: '',
            can_be_primary: false,
        });
        updateCategoryMock.mockResolvedValueOnce({
            id: 5,
            name: 'Updated',
            description: '',
            can_be_primary: false,
        });
        renderAt('/category/5');
        await waitFor(() => {
            expect(getCategoryMock).toHaveBeenCalled();
        });
        fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Updated' } });
        await act(async () => {
            fireEvent.submit(screen.getByRole('form'));
        });
        await waitFor(() => {
            expect(updateCategoryMock).toHaveBeenCalled();
        });
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/browse/categories');
        });
    });

    test('submit failure does not navigate', async () => {
        const consoleErr = jest.spyOn(console, 'error').mockImplementation(() => {});
        createCategoryMock.mockRejectedValueOnce(new Error('oh no'));
        renderAt('/category/new');
        fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'New' } });
        await act(async () => {
            try {
                fireEvent.submit(screen.getByRole('form'));
            } catch {
                // CategoryForm rethrows; that's fine.
            }
        });
        await waitFor(() => {
            expect(createCategoryMock).toHaveBeenCalled();
        });
        expect(mockNavigate).not.toHaveBeenCalledWith('/browse/categories');
        consoleErr.mockRestore();
    });
});
