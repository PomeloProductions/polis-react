import api from '../api';
import type {
  EmailTemplateClient,
  EmailTemplateEntry,
  EmailTemplateUpdate,
  PushTemplateClient,
  PushTemplateEntry,
  PushTemplateUpdate,
  TemplateListResponse,
} from '../../models/messaging-template';

/**
 * Default axios-backed clients for the email + push template admin
 * endpoints. Consuming apps can use these directly, or pass their own
 * implementations of `EmailTemplateClient` / `PushTemplateClient` to the
 * components for full control over fetching (auth, caching, etc.).
 *
 * Routes mirror the suggested registration in the polis-laravel abstract
 * controllers — keep these in lockstep with PR
 * `feat/template-admin-api-endpoints` on the API side.
 */

export const emailTemplateRequests: EmailTemplateClient = {
  async list(organizationId: number): Promise<EmailTemplateEntry[]> {
    const { data } = await api.get<TemplateListResponse<EmailTemplateEntry>>(
      `/organizations/${organizationId}/email-templates`,
    );
    return data.data;
  },

  async show(organizationId: number, key: string): Promise<EmailTemplateEntry> {
    const { data } = await api.get<EmailTemplateEntry>(
      `/organizations/${organizationId}/email-templates/${encodeURIComponent(key)}`,
    );
    return data;
  },

  async update(
    organizationId: number,
    key: string,
    payload: EmailTemplateUpdate,
  ): Promise<EmailTemplateEntry> {
    const { data } = await api.put<EmailTemplateEntry>(
      `/organizations/${organizationId}/email-templates/${encodeURIComponent(key)}`,
      payload,
    );
    return data;
  },

  async revert(organizationId: number, key: string): Promise<void> {
    await api.delete(`/organizations/${organizationId}/email-templates/${encodeURIComponent(key)}`);
  },
};

export const pushTemplateRequests: PushTemplateClient = {
  async list(organizationId: number): Promise<PushTemplateEntry[]> {
    const { data } = await api.get<TemplateListResponse<PushTemplateEntry>>(
      `/organizations/${organizationId}/push-templates`,
    );
    return data.data;
  },

  async show(organizationId: number, key: string): Promise<PushTemplateEntry> {
    const { data } = await api.get<PushTemplateEntry>(
      `/organizations/${organizationId}/push-templates/${encodeURIComponent(key)}`,
    );
    return data;
  },

  async update(
    organizationId: number,
    key: string,
    payload: PushTemplateUpdate,
  ): Promise<PushTemplateEntry> {
    const { data } = await api.put<PushTemplateEntry>(
      `/organizations/${organizationId}/push-templates/${encodeURIComponent(key)}`,
      payload,
    );
    return data;
  },

  async revert(organizationId: number, key: string): Promise<void> {
    await api.delete(`/organizations/${organizationId}/push-templates/${encodeURIComponent(key)}`);
  },
};
