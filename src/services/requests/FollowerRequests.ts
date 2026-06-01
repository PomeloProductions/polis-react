import api from '../api';
import Follower, { FollowerType } from '../../models/user/follower';
import User from '../../models/user/user';
import Category from "../../models/category";

export default class FollowerRequests {

    /**
     * Lets our logged in user to start following the business
     * @param user
     * @param follows
     * @param id
     * @param type
     */
    static async follow(user: User, follows: User|Category, id: number, type: FollowerType): Promise<Follower> {
        const {data} = await api.post('/users/' + user.id + '/follows', {
            follows_id: id,
            follows_type: type,
            notify: true,
        });

        return {
            ...data,
            follows: follows,
        } as Follower;
    }

    /**
     * Allows a user to stop following a business
     * @param follower
     */
    static async unFollow(follower: Follower): Promise<void> {
        await api.delete('/users/' + follower.user_id + '/follows/' + follower.id);
    }

    /**
     * Runs the update for us
     * @param follower
     * @param updateData
     */
    static async update(follower: Follower, updateData: Partial<Pick<Follower, 'hidden' | 'notify'>>): Promise<Follower> {
        const {data} = await api.put('/users/' + follower.user_id + '/follows/' + follower.id, updateData);
        return data as Follower;
    }
}
