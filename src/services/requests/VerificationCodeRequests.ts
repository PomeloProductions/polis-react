import api from '../api';

export default class VerificationCodeRequests {

    /**
     * This will request a verification code to be sent to the related phone number
     * @param phone
     * @param mustExist
     */
    static async requestVerificationCode(phone: string, mustExist: boolean): Promise<boolean> {
        const {data} = await api.post('/verification-codes', {
            phone: phone,
            must_exist: mustExist,
        });

        return data.status === 'OK';
    }

    /**
     * This will request a verification code to be sent to the related phone number
     * @param phone
     * @param code
     */
    static async validateVerificationCode(phone: string, code: number): Promise<boolean> {
        const {data} = await api.post('/verification-codes-validate', {
            phone: phone,
            code: code,
        });

        return data.status === 'OK';
    }
}
