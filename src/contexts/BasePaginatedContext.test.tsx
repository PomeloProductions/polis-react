import { defaultBaseContext, prepareContextState } from './BasePaginatedContext';
import { renderHook } from '@testing-library/react';
import { useState } from 'react';

// Mock the api module
jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        data: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        meta: {
          current_page: 1,
          last_page: 2,
          per_page: 10,
          total: 15,
        },
      },
    }),
  },
}));

describe('BasePaginatedContext', () => {
  describe('defaultBaseContext', () => {
    it('returns a default context state', () => {
      const defaultState = defaultBaseContext();
      
      expect(defaultState).toEqual({
        hasAnotherPage: false,
        initialLoadComplete: false,
        initiated: false,
        limit: 20,
        loadAll: false,
        loadedData: [],
        noResults: false,
        order: {},
        params: {},
        expands: [],
        filter: {},
        search: {},
        refreshing: false,
        addModel: expect.any(Function),
        getModel: expect.any(Function),
        loadNext: expect.any(Function),
        refreshData: expect.any(Function),
        removeModel: expect.any(Function),
        setFilter: expect.any(Function),
        setOrder: expect.any(Function),
        setSearch: expect.any(Function)
      });
    });
  });

  describe('prepareContextState', () => {
    it('prepares context state with callbacks', () => {
      const { result } = renderHook(() => {
        const [state, setState] = useState(defaultBaseContext());
        return prepareContextState(setState, state, '/test-endpoint');
      });
      
      // Test that the context state has all the required properties
      expect(result.current).toHaveProperty('hasAnotherPage');
      expect(result.current).toHaveProperty('initialLoadComplete');
      expect(result.current).toHaveProperty('initiated');
      expect(result.current).toHaveProperty('noResults');
      expect(result.current).toHaveProperty('refreshing');
      expect(result.current).toHaveProperty('expands');
      expect(result.current).toHaveProperty('order');
      expect(result.current).toHaveProperty('filter');
      expect(result.current).toHaveProperty('search');
      expect(result.current).toHaveProperty('limit');
      expect(result.current).toHaveProperty('loadedData');
      expect(result.current).toHaveProperty('loadAll');
      expect(result.current).toHaveProperty('loadNext');
      expect(result.current).toHaveProperty('refreshData');
      expect(result.current).toHaveProperty('setFilter');
      expect(result.current).toHaveProperty('setSearch');
      expect(result.current).toHaveProperty('addModel');
      expect(result.current).toHaveProperty('removeModel');
      expect(result.current).toHaveProperty('getModel');
      expect(result.current).toHaveProperty('params');
    });
  });
}); 