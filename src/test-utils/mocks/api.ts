export interface ApiConfig {
    params?: Record<string, unknown>;
    signal?: AbortSignal;
}

export interface ApiResponse<T> {
    data: T;
}

export interface Page<T> {
    current_page: number;
    last_page: number;
    total: number;
    data: T[];
}

const api = {
    get: jest.fn().mockImplementation((url: string, config?: ApiConfig): Promise<ApiResponse<Page<unknown>>> => {
        // Parse URL parameters from both URL and config
        const urlParams = new URLSearchParams(url.split('?')[1] || '');
        const configParams = config?.params || {};
        
        // Merge URL params with config params
        Object.entries(configParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                urlParams.set(key, value.toString());
            }
        });

        // Default response for unhandled endpoints
        return Promise.resolve({ 
            data: {
                current_page: 1,
                last_page: 1,
                total: 0,
                data: []
            }
        });
    }),

    post: jest.fn().mockImplementation((): Promise<ApiResponse<unknown>> => {
        return Promise.resolve({ data: null });
    }),

    put: jest.fn().mockImplementation((): Promise<ApiResponse<unknown>> => {
        return Promise.resolve({ data: null });
    }),

    delete: jest.fn().mockImplementation((): Promise<ApiResponse<{ success: boolean }>> => {
        return Promise.resolve({ data: { success: true } });
    })
};

// Mock the API module
jest.mock('../../services/api', () => ({
    __esModule: true,
    default: api
}));

export default api; 