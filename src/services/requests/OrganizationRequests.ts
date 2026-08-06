import api from '../api';
import Organization from '../../models/organization/organization';
import OrganizationManager from '../../models/organization/organization-manager';
import OrganizationArticle from '../../models/organization/organization-article';
import OrganizationPayment from '../../models/organization/organization-payment';
import Page from '../../models/page';

/**
 * Body for {@link OrganizationRequests.inviteOrganizationManager}. Invites a
 * user (by email) to manage an organization at a given role. If no account
 * exists for the email yet the backend sends an invitation email carrying an
 * `invitation_token` link; the invitee activates via the accept-invitation
 * page (which signs them up with that token).
 */
export interface InviteOrganizationManagerPayload {
  /**
   * The email address to invite.
   */
  email: string;
  /**
   * The role id to grant (ADMINISTRATOR = 10, MANAGER = 11).
   */
  role_id: number;
}

/**
 * Editable fields on an organization the Settings scaffolding writes.
 * `name` today; extensible as the model grows.
 */
export interface OrganizationPayload {
  name: string;
  [key: string]: unknown;
}

/**
 * Query params for {@link OrganizationRequests.listOrganizations}.
 */
export interface ListOrganizationsParams {
  page?: number;
  limit?: number;
}

export default class OrganizationRequests {
  /**
   * Fetches a single organization for the Settings "My organization" editor.
   *
   * Backend endpoint: GET /v1/organizations/{organization}
   * (polis-laravel OrganizationController@show — authorized by
   * OrganizationPolicy: org managers of that org, or super admins).
   *
   * @param organizationId the organization to load
   */
  static async getOrganization(organizationId: number): Promise<Organization> {
    const { data } = await api.get('/organizations/' + organizationId);
    return data as Organization;
  }

  /**
   * Updates an organization's editable fields (currently just `name`).
   *
   * Backend endpoint: PUT /v1/organizations/{organization} (Laravel resource
   * update accepts PUT|PATCH). Authorized for org managers of that org / super
   * admins. Validation: `name` string, max 120. Errors return HTTP 400 with
   * `{ errors: { name: [...] } }`.
   *
   * @param organizationId the organization to update
   * @param payload the editable fields to write
   */
  static async updateOrganization(
    organizationId: number,
    payload: OrganizationPayload,
  ): Promise<Organization> {
    const { data } = await api.put('/organizations/' + organizationId, payload);
    return data as Organization;
  }

  /**
   * Lists ALL organizations. Super-admin only (OrganizationPolicy::all()).
   *
   * Backend endpoint: GET /v1/organizations — returns the Athenia paginated
   * envelope (`Page<Organization>`: `{ total, current_page, per_page,
   * last_page, data: [] }`).
   *
   * @param params optional `page` / `limit`
   */
  static async listOrganizations(
    params: ListOrganizationsParams = {},
  ): Promise<Page<Organization>> {
    const { data } = await api.get('/organizations', { params });
    return data as Page<Organization>;
  }

  /**
   * Gets the users initial information, and returns them to
   */
  static async getMyOrganization(organizationId: number): Promise<Organization> {
    const { data } = await api.get('/organizations/' + organizationId, {
      params: {
        'expand[paymentMethods]': '*',
        'expand[subscriptions]': '*',
        'expand[subscriptions.lastRenewalRate]': '*',
        'expand[subscriptions.lastRenewalRate.membershipPlan]': '*',
        'expand[subscriptions.membershipPlanRate]': '*',
        'expand[subscriptions.membershipPlanRate.membershipPlan]': '*',
      },
    });

    return data as Organization;
  }

  /**
   * Creates an organization
   * @param organizationData
   */
  static async createOrganization(
    organizationData: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<Organization> {
    const { data } = await api.post('/organizations', organizationData);
    return data as Organization;
  }

  /**
   * Creates a payment method for us properly
   * @param organizationId
   * @param organizationManagerData
   */
  static async createOrganizationManager(
    organizationId: number,
    organizationManagerData: Partial<OrganizationManager>,
  ): Promise<OrganizationManager> {
    const { data } = await api.post(
      '/organizations/' + organizationId + '/organization-managers',
      organizationManagerData,
    );
    return data as OrganizationManager;
  }

  /**
   *
   * @param organizationManager
   * @param contactEmail
   */
  static async updateOrganizationManagerContactEmail(
    organizationManager: OrganizationManager,
    contactEmail: string,
  ): Promise<OrganizationManager> {
    const url =
      '/organizations/' +
      organizationManager.organization_id +
      '/organization-managers/' +
      organizationManager.id!;
    const { data } = await api.put(url, {
      contact_email: contactEmail,
    });
    return data as OrganizationManager;
  }

  /**
   * Accepts the invitation for us
   * @param invitationToken
   * @param verificationCode
   */
  static async acceptInvitation(
    invitationToken: string,
    verificationCode: string,
  ): Promise<OrganizationManager> {
    const { data } = await api.post('/accept-organization-invitation', {
      invitation_token: invitationToken,
      verification_code: verificationCode,
    });
    return data as OrganizationManager;
  }

  /**
   * Deletes an organization manager!
   * @param organizationManager
   */
  static async deleteOrganizationManager(organizationManager: OrganizationManager): Promise<void> {
    await api.delete(
      '/organizations/' +
        organizationManager.organization_id +
        '/organization-managers/' +
        organizationManager.id,
    );
  }

  /**
   * Lists the managers (members) of an organization for the Users tab of the
   * Organization detail page.
   *
   * Backend endpoint: GET /v1/organizations/{organization}/organization-managers
   * — returns the Athenia paginated envelope. Authorized for managers of that
   * org / super admins (OrganizationManagerPolicy).
   *
   * @param organizationId the organization whose managers to list
   */
  static async listOrganizationManagers(
    organizationId: number,
  ): Promise<Page<OrganizationManager>> {
    const { data } = await api.get('/organizations/' + organizationId + '/organization-managers', {
      params: {
        'expand[user]': '*',
      },
    });
    return data as Page<OrganizationManager>;
  }

  /**
   * Invites a user (by email) to manage an organization at a given role.
   *
   * Backend endpoint: POST /v1/organizations/{organization}/organization-managers
   * with `{ email, role_id }`. When the email has no account yet the backend
   * sends an invitation email carrying an `invitation_token` link; the invitee
   * activates by signing up with that token via the accept-invitation page.
   *
   * @param organizationId the organization to invite into
   * @param payload the invitee email + role id
   */
  static async inviteOrganizationManager(
    organizationId: number,
    payload: InviteOrganizationManagerPayload,
  ): Promise<OrganizationManager> {
    const { data } = await api.post(
      '/organizations/' + organizationId + '/organization-managers',
      payload,
    );
    return data as OrganizationManager;
  }

  /**
   * Lists an organization's articles (surfaced as "Contracts" in the
   * Organization detail page).
   *
   * Backend endpoint: GET /v1/organizations/{organization}/articles — returns
   * the Athenia paginated envelope. Authorized for managers of that org /
   * super admins (OrganizationArticlePolicy).
   *
   * @param organizationId the organization whose articles to list
   */
  static async listOrganizationArticles(
    organizationId: number,
  ): Promise<Page<OrganizationArticle>> {
    const { data } = await api.get('/organizations/' + organizationId + '/articles');
    return data as Page<OrganizationArticle>;
  }

  /**
   * Lists an organization's payments (surfaced as "Invoices" in the
   * Organization detail page).
   *
   * Backend endpoint: GET /v1/organizations/{organization}/payments — returns
   * the Athenia paginated envelope. Authorized for managers of that org /
   * super admins.
   *
   * @param organizationId the organization whose payments to list
   */
  static async listOrganizationPayments(
    organizationId: number,
  ): Promise<Page<OrganizationPayment>> {
    const { data } = await api.get('/organizations/' + organizationId + '/payments');
    return data as Page<OrganizationPayment>;
  }
}
