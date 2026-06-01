import api from '../api';

export default class InvitationTokenRequests {

    /**
     * This will validate that an invite will
     * @param token
     */
    static validateInvite(token: string): Promise<unknown> {
        return api.post('/validate-invitation', {token});
    }
}
