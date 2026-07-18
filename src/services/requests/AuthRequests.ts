import api, { dedupedGet } from '../api';
import User from '../../models/user/user';
import { storeReceivedToken } from '../AuthManager';

export interface LoginReq {
  apple_sign_in_token?: string;
  email?: string;
  phone?: string;
  password?: string;
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
  static async signIn(user: LoginReq): Promise<true> {
    const {
      data: { token },
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
      data: { token },
    } = await api.post('/auth/sign-up', submissionData);

    storeReceivedToken(token);

    return true;
  }

  /**
   * Gets the users initial information, and returns them to
   */
  static async getMe(): Promise<User> {
    const { data } = await dedupedGet('/users/me', {
      params: {
        'expand[roles]': '*',
      },
    });
    return data as User;
  }

  /**
   * Gets the logged-in user with the relations the Settings scaffolding needs:
   * `expand[roles]` (for super-admin gating) and
   * `expand[organizationManagers.organization]` (for the "My organization"
   * settings section). Athenia's expand contract is `expand[<relation>]=*`.
   *
   * Backend endpoint: GET /v1/users/me?expand[roles]=*&expand[organizationManagers.organization]=*
   */
  static async getMeWithOrganizations(): Promise<User> {
    const { data } = await dedupedGet('/users/me', {
      params: {
        'expand[roles]': '*',
        'expand[organizationManagers.organization]': '*',
      },
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
   * Updates the current user's password.
   *
   * Backend endpoint: PUT /v1/users/{user} with `{ password }`
   * (polis-laravel UserController@update — a user may only update themselves;
   * anyone else gets 403). Validation: `password` string, min 6. Invalid input
   * returns HTTP 400 with `{ errors: { password: [...] } }`.
   *
   * NOTE: the Athenia endpoint does NOT accept or verify a `current_password`
   * — the password is set directly. The form still collects a "new password +
   * confirm" pair (matched client-side) for typo safety.
   *
   * @param userId the id of the user (must be the logged-in user)
   * @param password the new password
   */
  static async updatePassword(userId: number, password: string): Promise<User> {
    const { data } = await api.put('/users/' + userId, { password });
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
