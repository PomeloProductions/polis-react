const postMock = jest.fn();
jest.mock('../api', () => ({
  __esModule: true,
  default: { post: (...args: unknown[]) => postMock(...args) },
}));

import VerificationCodeRequests from './VerificationCodeRequests';

beforeEach(() => {
  postMock.mockReset();
});

describe('VerificationCodeRequests', () => {
  test('requestVerificationCode returns true on OK', async () => {
    postMock.mockResolvedValueOnce({ data: { status: 'OK' } });
    const result = await VerificationCodeRequests.requestVerificationCode('1234567890', true);
    expect(postMock).toHaveBeenCalledWith('/verification-codes', {
      phone: '1234567890',
      must_exist: true,
    });
    expect(result).toBe(true);
  });

  test('requestVerificationCode returns false otherwise', async () => {
    postMock.mockResolvedValueOnce({ data: { status: 'NOPE' } });
    const result = await VerificationCodeRequests.requestVerificationCode('123', false);
    expect(result).toBe(false);
  });

  test('validateVerificationCode returns true on OK', async () => {
    postMock.mockResolvedValueOnce({ data: { status: 'OK' } });
    const result = await VerificationCodeRequests.validateVerificationCode('123', 4242);
    expect(postMock).toHaveBeenCalledWith('/verification-codes-validate', {
      phone: '123',
      code: 4242,
    });
    expect(result).toBe(true);
  });

  test('validateVerificationCode returns false on non-OK', async () => {
    postMock.mockResolvedValueOnce({ data: { status: 'BAD' } });
    const result = await VerificationCodeRequests.validateVerificationCode('123', 1);
    expect(result).toBe(false);
  });
});
