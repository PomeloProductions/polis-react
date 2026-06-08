/**
 * Shared TypeScript types for the email + push template admin endpoints
 * exposed by polis-laravel's
 * `Polis\Http\Core\Controllers\Messaging\{EmailTemplate,PushTemplate}ControllerAbstract`.
 *
 * The polis-react `TemplateList` and `TemplateEditor` components consume
 * these shapes directly; consuming apps wire concrete fetchers that the
 * components dispatch to.
 *
 * Endpoint contract (per the abstract controller PHPDoc on the API side):
 *
 *   GET    /organizations/{organization}/email-templates
 *          -> { data: EmailTemplateEntry[] }
 *   GET    /organizations/{organization}/email-templates/{key}
 *          -> EmailTemplateEntry
 *   PUT    /organizations/{organization}/email-templates/{key}
 *          body: { subject, body_html }
 *          -> EmailTemplateEntry  (the freshly-resolved row, source='org')
 *   DELETE /organizations/{organization}/email-templates/{key}
 *          -> 204 No Content (reverts the org override; idempotent)
 *
 *   ... same shape for push-templates, with title/body in place of
 *   subject/body_html.
 */

/**
 * Where the resolved subject/body came from in the org -> global ->
 * in-code-default lookup chain. The UI uses this to render a badge so
 * admins can tell at a glance whether a template is overridden, falling
 * back to a global, or showing the shipped default.
 */
export type TemplateSource = 'org' | 'global' | 'default';

/**
 * A single email template entry in the admin API response.
 */
export interface EmailTemplateEntry {
  /** Stable identifier (e.g. "welcome", "renewal_reminder"). */
  key: string;
  /** Resolved subject (per the lookup hierarchy). */
  subject: string;
  /** Resolved HTML body. */
  body_html: string;
  /**
   * The org this row is scoped to, or null when sourced from the global
   * row or the in-code default.
   */
  organization_id: number | null;
  /** Where the resolved values came from. */
  source: TemplateSource;
  /** In-code default subject (empty when no default exists). */
  default_subject: string;
  /** In-code default HTML body. */
  default_body_html: string;
}

/**
 * A single push template entry in the admin API response.
 */
export interface PushTemplateEntry {
  key: string;
  title: string;
  body: string;
  organization_id: number | null;
  source: TemplateSource;
  default_title: string;
  default_body: string;
}

/**
 * Request body for updating an email template.
 */
export interface EmailTemplateUpdate {
  subject: string;
  body_html: string;
}

/**
 * Request body for updating a push template.
 */
export interface PushTemplateUpdate {
  title: string;
  body: string;
}

/**
 * Index endpoint response wrapper.
 */
export interface TemplateListResponse<T> {
  data: T[];
}

/**
 * Abstracts the API surface the components dispatch to. Consuming apps
 * pass a concrete implementation that calls their actual fetcher (e.g.
 * the polis-react `services/api.ts` axios client). Components stay
 * mock-friendly + offline-shippable because they never touch axios
 * directly.
 */
export interface EmailTemplateClient {
  list(organizationId: number): Promise<EmailTemplateEntry[]>;
  show(organizationId: number, key: string): Promise<EmailTemplateEntry>;
  update(
    organizationId: number,
    key: string,
    payload: EmailTemplateUpdate,
  ): Promise<EmailTemplateEntry>;
  /** Revert: delete the org-scoped row, falling back to global/default. */
  revert(organizationId: number, key: string): Promise<void>;
}

export interface PushTemplateClient {
  list(organizationId: number): Promise<PushTemplateEntry[]>;
  show(organizationId: number, key: string): Promise<PushTemplateEntry>;
  update(
    organizationId: number,
    key: string,
    payload: PushTemplateUpdate,
  ): Promise<PushTemplateEntry>;
  revert(organizationId: number, key: string): Promise<void>;
}
