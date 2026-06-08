const getMock = jest.fn();
jest.mock('../api', () => ({
    __esModule: true,
    default: { get: (...args: unknown[]) => getMock(...args) },
}));

import UserRequests from './UserRequests';

beforeEach(() => getMock.mockReset());

describe('UserRequests', () => {
    test('getUser GETs /users/:id and returns data', async () => {
        getMock.mockResolvedValueOnce({ data: { id: 5 } });
        const r = await UserRequests.getUser(5);
        expect(getMock).toHaveBeenCalledWith('/users/5');
        expect(r).toEqual({ id: 5 });
    });
});
