import api from '../api';
import Organization from '../../models/organization/organization';
import OrganizationManager from '../../models/organization/organization-manager';
import Page from '../../models/page';

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
}
