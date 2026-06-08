const dedupedGetMock = jest.fn();
const postMock = jest.fn();
const putMock = jest.fn();
const deleteMock = jest.fn();
jest.mock('../api', () => ({
    __esModule: true,
    default: {
        post: (...args: unknown[]) => postMock(...args),
        put: (...args: unknown[]) => putMock(...args),
        delete: (...args: unknown[]) => deleteMock(...args),
    },
    dedupedGet: (...args: unknown[]) => dedupedGetMock(...args),
}));

import {
    getUserPages,
    createUserPage,
    updateUserPage,
    deleteUserPage,
    createUserPageComponent,
    updateUserPageComponent,
    deleteUserPageComponent,
} from './UserPageRequests';

beforeEach(() => {
    dedupedGetMock.mockReset();
    postMock.mockReset();
    putMock.mockReset();
    deleteMock.mockReset();
});

describe('UserPageRequests', () => {
    test('getUserPages uses dedupedGet with limit and expand', () => {
        dedupedGetMock.mockReturnValueOnce(Promise.resolve({}));
        getUserPages(7);
        expect(dedupedGetMock).toHaveBeenCalledWith('/users/7/pages', {
            params: { 'expand[components]': '*', limit: 100 },
        });
    });

    test('createUserPage posts to /users/:id/pages', () => {
        createUserPage(7, { slug: 'home' } as never);
        expect(postMock).toHaveBeenCalledWith('/users/7/pages', { slug: 'home' });
    });

    test('updateUserPage puts to /users/:id/pages/:pageId', () => {
        updateUserPage(7, 3, { slug: 'x' } as never);
        expect(putMock).toHaveBeenCalledWith('/users/7/pages/3', { slug: 'x' });
    });

    test('deleteUserPage deletes /users/:id/pages/:pageId', () => {
        deleteUserPage(7, 3);
        expect(deleteMock).toHaveBeenCalledWith('/users/7/pages/3');
    });

    test('createUserPageComponent posts to /users/:id/pages/:pageId/components', () => {
        createUserPageComponent(7, 3, { component_type: 'x' } as never);
        expect(postMock).toHaveBeenCalledWith('/users/7/pages/3/components', {
            component_type: 'x',
        });
    });

    test('updateUserPageComponent puts to /users/:id/pages/:pageId/components/:cid', () => {
        updateUserPageComponent(7, 3, 9, { config_json: {} } as never);
        expect(putMock).toHaveBeenCalledWith('/users/7/pages/3/components/9', {
            config_json: {},
        });
    });

    test('deleteUserPageComponent deletes /users/:id/pages/:pageId/components/:cid', () => {
        deleteUserPageComponent(7, 3, 9);
        expect(deleteMock).toHaveBeenCalledWith('/users/7/pages/3/components/9');
    });
});
