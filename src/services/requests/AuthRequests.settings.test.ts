const putMock = jest.fn();
const dedupedGetMock = jest.fn();
jest.mock('../api', () => ({
  __esModule: true,
  default: { put: (...args: unknown[]) => putMock(...args) },
  dedupedGet: (...args: unknown[]) => dedupedGetMock(...args),
}));
jest.mock('../AuthManager', () => ({
  __esModule: true,
  storeReceivedToken: jest.fn(),
}));

import AuthRequests from './AuthRequests';

beforeEach(() => {
  putMock.mockReset();
  dedupedGetMock.mockReset();
});

describe('AuthRequests settings helpers', () => {
  test('updatePassword PUTs /users/:id with { password }', async () => {
    putMock.mockResolvedValueOnce({ data: { id: 5 } });
    const result = await AuthRequests.updatePassword(5, 'hunter2!');
    expect(putMock).toHaveBeenCalledWith('/users/5', { password: 'hunter2!' });
    expect(result).toEqual({ id: 5 });
  });

  test('getMeWithOrganizations expands roles + organizationManagers.organization', async () => {
    dedupedGetMock.mockResolvedValueOnce({ data: { id: 1, roles: [] } });
    const result = await AuthRequests.getMeWithOrganizations();
    expect(dedupedGetMock).toHaveBeenCalledWith('/users/me', {
      params: {
        'expand[roles]': '*',
        'expand[organizationManagers.organization]': '*',
      },
    });
    expect(result).toEqual({ id: 1, roles: [] });
  });
});
