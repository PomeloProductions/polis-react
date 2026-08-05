import BaseModel from '../base-model';

/**
 * An article scoped to an organization — used as the "Contracts" surface on
 * the Organization detail page. Backed by the polis-laravel wiki Article
 * model, exposed org-scoped via `GET /organizations/{organization}/articles`.
 */
export default interface OrganizationArticle extends BaseModel {
  /**
   * The organization this article belongs to.
   */
  organization_id?: number;

  /**
   * The article title (contract name).
   */
  title: string;

  /**
   * The rendered/body content of the article, if loaded.
   */
  content?: string;

  /**
   * Optional short description / summary.
   */
  description?: string;

  /**
   * Publication status flag if the backend exposes one.
   */
  published?: boolean;
}

export const placeholderOrganizationArticle = (): OrganizationArticle => ({
  title: '',
});
