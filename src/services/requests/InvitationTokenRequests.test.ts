const postMock = jest.fn();
jest.mock('../api', () => ({
    __esModule: true,
    default: { post: (...args: unknown[]) => postMock(...args) },
}));

import InvitationTokenRequests from './InvitationTokenRequests';

describe('InvitationTokenRequests', () => {
    test('validateInvite posts to /validate-invitation with the token', async () => {
        const expected = { data: {} };
        postMock.mockResolvedValueOnce(expected);
        const result = await InvitationTokenRequests.validateInvite('tok-123');
        expect(postMock).toHaveBeenCalledWith('/validate-invitation', { token: 'tok-123' });
        expect(result).toBe(expected);
    });
});
