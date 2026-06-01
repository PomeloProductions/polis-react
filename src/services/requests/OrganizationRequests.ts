import api from '../api'
import Organization from '../../models/organization/organization';
import OrganizationManager from '../../models/organization/organization-manager';

export default class OrganizationRequests {

    /**
     * Gets the users initial information, and returns them to
     */
    static async getMyOrganization(organizationId: number) : Promise<Organization> {
        const { data } = await api.get('/organizations/' + organizationId, {
            params: {
                'expand[paymentMethods]': '*',
                'expand[subscriptions]': '*',
                'expand[subscriptions.lastRenewalRate]': '*',
                'expand[subscriptions.lastRenewalRate.membershipPlan]': '*',
                'expand[subscriptions.membershipPlanRate]': '*',
                'expand[subscriptions.membershipPlanRate.membershipPlan]': '*',
            }
        });

        return data as Organization
    }

    /**
     * Creates an organization
     * @param organizationData
     */
    static async createOrganization(organizationData: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>): Promise<Organization> {
        const { data } = await api.post('/organizations', organizationData);
        return data as Organization;
    }

    /**
     * Creates a payment method for us properly
     * @param organizationId
     * @param organizationManagerData
     */
    static async createOrganizationManager(organizationId: number, organizationManagerData: Partial<OrganizationManager>): Promise<OrganizationManager> {
        const { data } = await api.post('/organizations/' + organizationId + '/organization-managers', organizationManagerData);
        return data as OrganizationManager;
    }

    /**
     *
     * @param organizationManager
     * @param contactEmail
     */
    static async updateOrganizationManagerContactEmail(organizationManager: OrganizationManager, contactEmail: string): Promise<OrganizationManager> {
        const url ='/organizations/' + organizationManager.organization_id
                + '/organization-managers/' + organizationManager.id!;
        const { data } = await api.put(url, {
            contact_email: contactEmail
        });
        return data as OrganizationManager;
    }

    /**
     * Accepts the invitation for us
     * @param invitationToken
     * @param verificationCode
     */
    static async acceptInvitation(invitationToken: string, verificationCode: string): Promise<OrganizationManager> {
        const { data } = await api.post('/accept-organization-invitation', {
            invitation_token: invitationToken,
            verification_code: verificationCode,
        })
        return data as OrganizationManager;
    }

    /**
     * Deletes an organization manager!
     * @param organizationManager
     */
    static async deleteOrganizationManager(organizationManager: OrganizationManager) : Promise<void> {
        await api.delete('/organizations/' + organizationManager.organization_id +  '/organization-managers/' + organizationManager.id)
    }
}
