const postMock = jest.fn();
const deleteMock = jest.fn();
const putMock = jest.fn();
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => postMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
    put: (...args: unknown[]) => putMock(...args),
  },
}));

import FollowerRequests from './FollowerRequests';

beforeEach(() => {
  postMock.mockReset();
  deleteMock.mockReset();
  putMock.mockReset();
});

describe('FollowerRequests', () => {
  test('follow posts to /users/<id>/follows and includes target', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 99 } });
    const me = { id: 1 } as never;
    const follows = { id: 42 } as never;
    const result = await FollowerRequests.follow(me, follows, 42, 'user' as never);
    expect(postMock).toHaveBeenCalledWith('/users/1/follows', {
      follows_id: 42,
      follows_type: 'user',
      notify: true,
    });
    expect(result).toEqual({ id: 99, follows });
  });

  test('unFollow calls DELETE on the follow', async () => {
    deleteMock.mockResolvedValueOnce({});
    await FollowerRequests.unFollow({ id: 5, user_id: 3 } as never);
    expect(deleteMock).toHaveBeenCalledWith('/users/3/follows/5');
  });

  test('update PUTs the new fields', async () => {
    putMock.mockResolvedValueOnce({ data: { id: 5, hidden: true } });
    const result = await FollowerRequests.update({ id: 5, user_id: 3 } as never, { hidden: true });
    expect(putMock).toHaveBeenCalledWith('/users/3/follows/5', { hidden: true });
    expect(result).toEqual({ id: 5, hidden: true });
  });
});
