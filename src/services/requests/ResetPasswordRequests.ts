import api from '../api';

export default class ResetPasswordRequests {

    /**
     * Runs a request to let the user reset their password
     * @param email
     */
    static async forgotPassword(email: string): Promise<unknown> {
        const { data } = await api.post('/forgot-password', { email });

        return data;
    }
    /**
     * Runs a request to let the user reset their password
     * @param token
     * @param email
     * @param password
     */
    static async resetPassword(token: string, email: string, password: string): Promise<unknown> {
        const { data } = await api.post('/reset-password', {
            token,
            email,
            password,
        });

        return data;
    }
}
