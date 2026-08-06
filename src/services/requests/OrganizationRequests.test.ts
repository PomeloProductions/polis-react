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
      expect.objectContaining({ params: expect.any(Object) }),
    );
    expect(result).toEqual({ id: 1 });
  });

  test('createOrganization POSTs to /organizations', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 2 } });
    const result = await OrganizationRequests.createOrganization({ name: 'X' } as never);
    expect(postMock).toHaveBeenCalledWith('/organizations', { name: 'X' });
    expect(result).toEqual({ id: 2 });
  });

  test('getOrganization GETs /organizations/:id', async () => {
    getMock.mockResolvedValueOnce({ data: { id: 4, name: 'Acme' } });
    const result = await OrganizationRequests.getOrganization(4);
    expect(getMock).toHaveBeenCalledWith('/organizations/4');
    expect(result).toEqual({ id: 4, name: 'Acme' });
  });

  test('updateOrganization PUTs /organizations/:id with payload', async () => {
    putMock.mockResolvedValueOnce({ data: { id: 4, name: 'New' } });
    const result = await OrganizationRequests.updateOrganization(4, { name: 'New' });
    expect(putMock).toHaveBeenCalledWith('/organizations/4', { name: 'New' });
    expect(result).toEqual({ id: 4, name: 'New' });
  });

  test('listOrganizations GETs /organizations with page/limit params', async () => {
    getMock.mockResolvedValueOnce({
      data: { data: [{ id: 1 }], total: 1, current_page: 1, per_page: 50, last_page: 1 },
    });
    const result = await OrganizationRequests.listOrganizations({ limit: 50, page: 1 });
    expect(getMock).toHaveBeenCalledWith('/organizations', { params: { limit: 50, page: 1 } });
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.total).toBe(1);
  });

  test('createOrganizationManager POSTs to /organizations/:id/organization-managers', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 3 } });
    const result = await OrganizationRequests.createOrganizationManager(7, {
      user_id: 1,
    } as never);
    expect(postMock).toHaveBeenCalledWith('/organizations/7/organization-managers', { user_id: 1 });
    expect(result).toEqual({ id: 3 });
  });

  test('updateOrganizationManagerContactEmail PUTs to the correct URL', async () => {
    putMock.mockResolvedValueOnce({ data: { id: 9 } });
    const result = await OrganizationRequests.updateOrganizationManagerContactEmail(
      { id: 9, organization_id: 7 } as never,
      'me@x.com',
    );
    expect(putMock).toHaveBeenCalledWith('/organizations/7/organization-managers/9', {
      contact_email: 'me@x.com',
    });
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

  test('listOrganizationManagers GETs the members with user expand', async () => {
    getMock.mockResolvedValueOnce({ data: { data: [{ id: 1 }], total: 1 } });
    const result = await OrganizationRequests.listOrganizationManagers(7);
    expect(getMock).toHaveBeenCalledWith(
      '/organizations/7/organization-managers',
      expect.objectContaining({ params: expect.objectContaining({ 'expand[user]': '*' }) }),
    );
    expect(result).toEqual({ data: [{ id: 1 }], total: 1 });
  });

  test('inviteOrganizationManager POSTs { email, role_id }', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 12 } });
    const result = await OrganizationRequests.inviteOrganizationManager(7, {
      email: 'invitee@x.com',
      role_id: 11,
    });
    expect(postMock).toHaveBeenCalledWith('/organizations/7/organization-managers', {
      email: 'invitee@x.com',
      role_id: 11,
    });
    expect(result).toEqual({ id: 12 });
  });

  test('listOrganizationArticles GETs /organizations/:id/articles', async () => {
    getMock.mockResolvedValueOnce({ data: { data: [{ id: 1, title: 'C' }], total: 1 } });
    const result = await OrganizationRequests.listOrganizationArticles(7);
    expect(getMock).toHaveBeenCalledWith('/organizations/7/articles');
    expect(result).toEqual({ data: [{ id: 1, title: 'C' }], total: 1 });
  });

  test('listOrganizationPayments GETs /organizations/:id/payments', async () => {
    getMock.mockResolvedValueOnce({ data: { data: [{ id: 1, amount: 10 }], total: 1 } });
    const result = await OrganizationRequests.listOrganizationPayments(7);
    expect(getMock).toHaveBeenCalledWith('/organizations/7/payments');
    expect(result).toEqual({ data: [{ id: 1, amount: 10 }], total: 1 });
  });
});
