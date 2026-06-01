import { mockPagination } from '../pagination';
import BaseModel from '../../../models/base-model';

// Mock appState
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).appState = {
    state: {
        persistent: {
            tokenData: null
        },
        session: {
            loadingCount: 0
        }
    },
    dispatch: jest.fn()
};

// Mock functions
export const mockSetFilter = jest.fn();

// Base mock context state creator
export const createBaseMockContextState = <T extends BaseModel>(data: T[]) => mockPagination<T>({
    loadedData: data,
    initialLoadComplete: true,
    refreshing: false,
    hasAnotherPage: false,
    initiated: true,
    noResults: false,
    expands: [],
    order: {},
    filter: {},
    search: {},
    limit: 20,
    loadAll: false,
    setFilter: jest.fn(),
    setSearch: jest.fn(),
    setOrder: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addModel: jest.fn((_model: T) => {}),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removeModel: jest.fn((_model: T) => {}),
    getModel: jest.fn((id: number) => {
        const found = data.find(item => typeof item.id === 'number' && item.id === id);
        return found || null;
    }),
    params: {},
    loadNext: jest.fn(),
    refreshData: jest.fn()
}); 