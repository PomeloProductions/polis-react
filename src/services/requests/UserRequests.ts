import api from '../api';
import User from '../../models/user/user';

export default class UserRequests {

    /**
     * Gets a single psot off the server
     * @param userId
     */
    static async getUser(userId: number): Promise<User> {
        const {data} = await api.get('/users/' + userId);

        return data as User;
    }
}
