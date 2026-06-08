const getMock = jest.fn();
const postMock = jest.fn();
const putMock = jest.fn();
const deleteMock = jest.fn();
jest.mock('../api', () => ({
    __esModule: true,
    default: {
        get: (...args: unknown[]) => getMock(...args),
        post: (...args: unknown[]) => postMock(...args),
        put: (...args: unknown[]) => putMock(...args),
        delete: (...args: unknown[]) => deleteMock(...args),
    },
}));

import OrganizationRequests from './OrganizationRequests';

beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    putMock.mockReset();
    deleteMock.mockReset();
});

describe('OrganizationRequests', () => {
    test('getMyOrganization GETs with full expand params', async () => {
        getMock.mockResolvedValueOnce({ data: { id: 1 } });
        const result = await OrganizationRequests.getMyOrganization(1);
        expect(getMock).toHaveBeenCalledWith(
            '/organizations/1',
            expect.objectContaining({ params: expect.any(Object) })
        );
        expect(result).toEqual({ id: 1 });
    });

    test('createOrganization POSTs to /organizations', async () => {
        postMock.mockResolvedValueOnce({ data: { id: 2 } });
        const result = await OrganizationRequests.createOrganization({ name: 'X' } as never);
        expect(postMock).toHaveBeenCalledWith('/organizations', { name: 'X' });
        expect(result).toEqual({ id: 2 });
    });

    test('createOrganizationManager POSTs to /organizations/:id/organization-managers', async () => {
        postMock.mockResolvedValueOnce({ data: { id: 3 } });
        const result = await OrganizationRequests.createOrganizationManager(7, {
            user_id: 1,
        } as never);
        expect(postMock).toHaveBeenCalledWith(
            '/organizations/7/organization-managers',
            { user_id: 1 }
        );
        expect(result).toEqual({ id: 3 });
    });

    test('updateOrganizationManagerContactEmail PUTs to the correct URL', async () => {
        putMock.mockResolvedValueOnce({ data: { id: 9 } });
        const result = await OrganizationRequests.updateOrganizationManagerContactEmail(
            { id: 9, organization_id: 7 } as never,
            'me@x.com'
        );
        expect(putMock).toHaveBeenCalledWith(
            '/organizations/7/organization-managers/9',
            { contact_email: 'me@x.com' }
        );
        expect(result).toEqual({ id: 9 });
    });

    test('acceptInvitation POSTs to /accept-organization-invitation', async () => {
        postMock.mockResolvedValueOnce({ data: { id: 11 } });
        const result = await OrganizationRequests.acceptInvitation('tok', '1234');
        expect(postMock).toHaveBeenCalledWith('/accept-organization-invitation', {
            invitation_token: 'tok',
            verification_code: '1234',
        });
        expect(result).toEqual({ id: 11 });
    });

    test('deleteOrganizationManager DELETEs the correct URL', async () => {
        deleteMock.mockResolvedValueOnce({});
        await OrganizationRequests.deleteOrganizationManager({
            id: 9,
            organization_id: 7,
        } as never);
        expect(deleteMock).toHaveBeenCalledWith('/organizations/7/organization-managers/9');
    });
});
