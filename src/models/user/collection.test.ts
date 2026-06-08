import { collectionDefaultData, collectionPlaceholder, placeholderCollection } from './collection';

describe('collection model helpers', () => {
  test('collectionDefaultData exposes expected defaults', () => {
    expect(collectionDefaultData).toEqual({
      is_public: false,
      owner_type: 'user',
    });
  });

  test('collectionPlaceholder is shaped as Collection', () => {
    expect(collectionPlaceholder).toMatchObject({
      type: 'collection',
      owner_id: 0,
      is_public: false,
    });
  });

  test('placeholderCollection returns a fresh object', () => {
    const a = placeholderCollection();
    const b = placeholderCollection();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
