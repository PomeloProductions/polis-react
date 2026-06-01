import api, { dedupedGet } from '../api'
import User from '../../models/user/user';
import {storeReceivedToken} from '../AuthManager';

export interface LoginReq {
	apple_sign_in_token?: string
	email?: string
	phone?: string
	password?: string
}

export interface SignUpData {
	email: string;
	password: string;
	first_name: string;
	last_name: string;
	invitation_token?: string;
}

export default class AuthRequests {

	/**
	 * Runs the sign in request, and then gets the logged in users information
	 * @param user
	 */
	static async signIn(user: LoginReq): Promise<true>  {
		const {
			data: { token }
		} = await api.post('/auth/login', user);

		storeReceivedToken(token);

		return true;
	}

	/**
	 * Runs the sign up request, and then get the full user information off the server
	 * @param submissionData
	 */
	static async signUp(submissionData: SignUpData): Promise<true> {
		const {
			data: { token }
		} = await api.post('/auth/sign-up', submissionData);

		storeReceivedToken(token);

		return true;
	}

	/**
	 * Gets the users initial information, and returns them to
	 */
	static async getMe() : Promise<User> {
		const { data } = await dedupedGet('/users/me', {
			params: {
				'expand[roles]': '*',
			}
		});
		return data as User;
	}

	/**
	 * Updates the user information properly
	 * @param userId
	 * @param updateData
	 */
	static async updateMe(userId: number, updateData: Partial<User>): Promise<User> {
		const { data } = await api.put('/users/' + userId, updateData);
		return data as User;
	}

	/**
	 * Erase a user from existence
	 */
	static async eraseMe(): Promise<User> {
		const { data } = await api.delete('/users/erase');
		return data;
	}
}
