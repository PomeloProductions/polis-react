import BaseModel from '../base-model';

/**
 * A payment / invoice line scoped to an organization — used as the "Invoices"
 * surface on the Organization detail page. Backed by the Athenia payment
 * records, exposed org-scoped via `GET /organizations/{organization}/payments`.
 */
export default interface OrganizationPayment extends BaseModel {
  /**
   * The organization this payment belongs to.
   */
  organization_id?: number;

  /**
   * The charged amount (major currency units, e.g. dollars).
   */
  amount?: number;

  /**
   * ISO currency code (e.g. "usd") if the backend exposes one.
   */
  currency?: string;

  /**
   * The payment / invoice status (e.g. "paid", "pending", "refunded").
   */
  status?: string;

  /**
   * A human-readable description of what was billed.
   */
  description?: string;

  /**
   * When the payment was made / the invoice was issued.
   */
  paid_at?: string;
}

export const placeholderOrganizationPayment = (): OrganizationPayment => ({});
