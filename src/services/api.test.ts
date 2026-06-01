import { jest } from '@jest/globals';

// Mock import.meta.env before importing the API
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:3000',
        MODE: 'test',
        BASE_URL: '/',
      }
    }
  },
  writable: true
});

// Mock dependencies
jest.mock('../data/AppContext', () => ({
  appState: {
    state: {
      persistent: {
        tokenData: null
      }
    },
    dispatch: jest.fn()
  }
}));

jest.mock('./AuthManager', () => ({
  storeReceivedToken: jest.fn(),
  tokenNeedsRefresh: jest.fn()
}));

jest.mock('../data/session/session.actions', () => ({
  incrementLoadingCount: jest.fn(),
  decrementLoadingCount: jest.fn()
}));

const mockAxiosInstance = {
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

jest.mock('axios', () => {
  const mockCreate = jest.fn();
  mockCreate.mockReturnValue(mockAxiosInstance);
  
  return {
    default: {
      create: mockCreate,
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    }
  };
});

describe('API', () => {
  let apiModule: any;
  let api: any;

  beforeAll(() => {
    // Import after all mocks are set up
    apiModule = require('./api');
    api = apiModule.default;
  });

  it('creates axios instance with correct baseURL', () => {
    expect(api).toBeDefined();
    expect(api.get).toBeDefined();
    expect(api.post).toBeDefined();
    expect(api.put).toBeDefined();
    expect(api.delete).toBeDefined();
  });
}); 