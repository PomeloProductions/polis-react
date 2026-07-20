import { AxiosError } from 'axios';

/**
 * Field-level validation errors as Athenia / polis-laravel returns them:
 * `{ field: [messages] }`.
 */
export type FieldErrors = Record<string, string[]>;

/**
 * The normalized shape of a parsed API error.
 */
export interface ParsedApiError {
  /**
   * Per-field validation messages, keyed by field name. Empty when the
   * failure wasn't a field-validation error.
   */
  fieldErrors: FieldErrors;
  /**
   * A single human-readable message for non-field failures, or `null` when
   * the failure was purely field-level (so the caller can surface the
   * per-field errors instead).
   */
  message: string | null;
}

interface AtheniaErrorBody {
  errors?: FieldErrors;
  message?: string;
}

/**
 * Normalize an unknown thrown value into a `{ fieldErrors, message }` pair.
 *
 * Athenia / polis-laravel returns validation failures as HTTP 400 with a body
 * of `{ errors: { field: [msg, ...] } }` (note: 400, not Laravel's default
 * 422 — some resources still use 422, so both are accepted). Other failures
 * surface a top-level `{ message }`. The package's `api.ts` interceptor may
 * surface either a raw `AxiosError` or a `{ status, data }` shape, so both are
 * handled.
 *
 * @param error the thrown value
 * @param fallback message to use when nothing more specific can be extracted
 */
export function parseApiError(error: unknown, fallback: string): ParsedApiError {
  const candidate = error as
    | (AxiosError<AtheniaErrorBody> & { data?: AtheniaErrorBody })
    | { status?: number; data?: AtheniaErrorBody; message?: string }
    | undefined;

  // Prefer the axios response envelope, then fall back to the flattened
  // `{ status, data }` shape the package's api.ts sometimes throws.
  const status =
    (candidate as AxiosError)?.response?.status ?? (candidate as { status?: number })?.status;
  const body =
    ((candidate as AxiosError<AtheniaErrorBody>)?.response?.data as AtheniaErrorBody | undefined) ??
    ((candidate as { data?: AtheniaErrorBody })?.data as AtheniaErrorBody | undefined);

  if ((status === 400 || status === 422) && body?.errors) {
    return { fieldErrors: body.errors, message: null };
  }
  if (body?.message) {
    return { fieldErrors: {}, message: body.message };
  }
  return { fieldErrors: {}, message: fallback };
}

/**
 * Convenience: collapse the first message for each field into a
 * `Record<string, string>` (Formik's `setErrors` shape).
 */
export function firstFieldErrors(fieldErrors: FieldErrors): Record<string, string> {
  const flattened: Record<string, string> = {};
  Object.entries(fieldErrors).forEach(([field, messages]) => {
    if (Array.isArray(messages) && messages.length > 0) {
      flattened[field] = messages[0];
    }
  });
  return flattened;
}
