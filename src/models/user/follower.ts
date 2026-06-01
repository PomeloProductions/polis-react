import BaseModel from '../base-model';
import User from './user';
import Category from "../category";

export type FollowerType = 'user' | 'category';

/**
 * The data interface for the follows location
 */
export default interface Follower extends BaseModel {

    /**
     * The primary id of the business being followed
     */
    follows_id: number;

    /**
     * What type of follow this is
     */
    follows_type: FollowerType;

    /**
     * The id of the user that is the actual follower
     */
    user_id: number;

    /**
     * Whether or not this should be hidden from view.
     * Followed locations that are hidden should automatically be filtered out from the API,
     * but we will track it on our end for safety.
     */
    hidden: boolean;

    /**
     * Whether or not the member will be notified when a post is created
     */
    notify: boolean;

    /**
     * The business the user is following
     */
    follows?: User | Category;

    /**
     * The user that is doing the following
     */
    user?: User
}

/**
 * Finds a follower from a list if it exists
 * @param follows
 * @param relatedId
 * @param relatedType
 */
export function findFollower(follows: Follower[], relatedId: number, relatedType: FollowerType): Follower|undefined {
    return follows.find(i => i.follows_id === relatedId && i.follows_type === relatedType);
}

/**
 * Quick helper function for determining if the user is following a single location based on the locations we have
 * @param follows
 * @param relatedId
 * @param relatedType
 */
export function isFollowingEntity(follows: Follower[], relatedId: number, relatedType: FollowerType): boolean {
    return findFollower(follows, relatedId, relatedType) !== undefined;
}
