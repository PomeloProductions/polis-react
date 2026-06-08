const postMock = jest.fn();
jest.mock('../api', () => ({
  __esModule: true,
  default: { post: (...args: unknown[]) => postMock(...args) },
}));

import ResetPasswordRequests from './ResetPasswordRequests';

beforeEach(() => {
  postMock.mockReset();
});

describe('ResetPasswordRequests', () => {
  test('forgotPassword posts the email and returns data', async () => {
    postMock.mockResolvedValueOnce({ data: { ok: true } });
    const result = await ResetPasswordRequests.forgotPassword('a@b.com');
    expect(postMock).toHaveBeenCalledWith('/forgot-password', { email: 'a@b.com' });
    expect(result).toEqual({ ok: true });
  });

  test('resetPassword posts the token, email, password and returns data', async () => {
    postMock.mockResolvedValueOnce({ data: { ok: true } });
    const result = await ResetPasswordRequests.resetPassword('tok', 'a@b.com', 'pw');
    expect(postMock).toHaveBeenCalledWith('/reset-password', {
      token: 'tok',
      email: 'a@b.com',
      password: 'pw',
    });
    expect(result).toEqual({ ok: true });
  });
});
