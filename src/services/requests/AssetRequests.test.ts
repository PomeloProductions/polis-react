const postMock = jest.fn();
jest.mock('../api', () => ({
    __esModule: true,
    default: { post: (...args: unknown[]) => postMock(...args) },
}));

import AssetRequests from './AssetRequests';

beforeEach(() => postMock.mockReset());

describe('AssetRequests', () => {
    test('uploadAsset POSTs with file contents and caption', async () => {
        postMock.mockResolvedValueOnce({ data: { id: 1 } });
        const r = await AssetRequests.uploadAsset('/assets', 'abc', 'cap');
        expect(postMock).toHaveBeenCalledWith('/assets', {
            file_contents: 'abc',
            caption: 'cap',
        });
        expect(r).toEqual({ id: 1 });
    });

    test('caption defaults to null', async () => {
        postMock.mockResolvedValueOnce({ data: { id: 2 } });
        await AssetRequests.uploadAsset('/assets', 'abc');
        expect(postMock).toHaveBeenCalledWith('/assets', {
            file_contents: 'abc',
            caption: null,
        });
    });
});
