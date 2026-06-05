jest.mock('axios', () => ({
    __esModule: true,
    default: {
        create: jest.fn(() => ({ get: jest.fn(), post: jest.fn() })),
    },
    create: jest.fn(() => ({ get: jest.fn(), post: jest.fn() })),
}));

import fbApi from './fb-api';

describe('fb-api', () => {
    test('exports an axios instance', () => {
        expect(fbApi).toBeDefined();
    });
});
