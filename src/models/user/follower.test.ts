import { findFollower, isFollowingEntity } from './follower';

const follows = [
    { id: 1, follows_id: 1, follows_type: 'user', user_id: 7, hidden: false, notify: true } as never,
    { id: 2, follows_id: 5, follows_type: 'category', user_id: 7, hidden: false, notify: true } as never,
];

describe('follower helpers', () => {
    test('findFollower returns matching follower', () => {
        expect(findFollower(follows, 1, 'user')).toEqual(follows[0]);
        expect(findFollower(follows, 5, 'category')).toEqual(follows[1]);
    });

    test('findFollower returns undefined when no match', () => {
        expect(findFollower(follows, 9, 'user')).toBeUndefined();
        expect(findFollower(follows, 1, 'category')).toBeUndefined();
    });

    test('isFollowingEntity returns true for known follow', () => {
        expect(isFollowingEntity(follows, 1, 'user')).toBe(true);
    });

    test('isFollowingEntity returns false otherwise', () => {
        expect(isFollowingEntity(follows, 1, 'category')).toBe(false);
        expect(isFollowingEntity(follows, 99, 'user')).toBe(false);
    });
});
