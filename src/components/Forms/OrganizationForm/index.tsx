import { ReactNode, useState } from 'react';
import { Button, Form, FormControl, FormLabel, Spinner } from 'react-bootstrap';
import { FormikErrors, FormikProps, useFormik } from 'formik';
import * as Yup from 'yup';

/**
 * The base values every OrganizationForm submission carries. Consumers can
 * extend with additional fields via `additionalInitialValues` +
 * `additionalFields`; the package always owns `name`.
 */
export interface OrganizationValues {
  name: string;
}

interface ApiError {
  status?: number;
  message?: string;
  data?: {
    errors?: Record<string, string[]>;
    message?: string;
  };
}

export interface OrganizationFormProps<
  TExtra extends Record<string, unknown> = Record<string, never>,
> {
  /**
   * Called with the merged values when the form validates + submits. The
   * consumer wires the actual API call here (create or update). The form stays
   * presentational — no direct API/Redux coupling.
   *
   * Throw to surface an error: `{ status: 400|422, data: { errors } }` maps
   * onto the matching fields; anything else shows a general message.
   */
  onSubmit: (values: OrganizationValues & TExtra) => Promise<void>;
  /**
   * Initial values for the base + any extra fields. `name` defaults to ''.
   */
  initialValues?: Partial<OrganizationValues> & TExtra;
  /**
   * Render additional fields below the name field. Receives the full Formik
   * bag.
   */
  additionalFields?: (formik: FormikProps<OrganizationValues & TExtra>) => ReactNode;
  /**
   * Yup schema merged into the base validation (name required, max 120).
   */
  additionalValidation?: Yup.AnySchema;
  /**
   * Max length for the name field. Defaults to 120 (Athenia rule).
   */
  nameMaxLength?: number;
  /**
   * Called after a successful submit.
   */
  onSuccess?: () => void;
  /**
   * Label for the submit button. Defaults to "Save".
   */
  submitLabel?: string;
}

/**
 * Presentational organization form (name, extensible). Mirrors the auth forms:
 * formik + yup + react-bootstrap, behavior injected via `onSubmit`. Used by
 * both the "My organization" editor and the super-admin create/edit flow.
 */
function OrganizationForm<TExtra extends Record<string, unknown> = Record<string, never>>({
  onSubmit,
  initialValues,
  additionalFields,
  additionalValidation,
  nameMaxLength = 120,
  onSuccess,
  submitLabel,
}: OrganizationFormProps<TExtra>) {
  const [generalError, setGeneralError] = useState<string | null>(null);

  const baseSchema = Yup.object().shape({
    name: Yup.string()
      .trim()
      .max(nameMaxLength, `Name must be at most ${nameMaxLength} characters`)
      .required('Name is required'),
  });

  const validationSchema = additionalValidation
    ? baseSchema.concat(additionalValidation as Yup.AnyObjectSchema)
    : baseSchema;

  const merged = {
    name: '',
    ...(initialValues || ({} as TExtra)),
  } as OrganizationValues & TExtra;

  const submit = async (values: OrganizationValues & TExtra) => {
    setGeneralError(null);
    try {
      await onSubmit({ ...values, name: values.name.trim() });
      onSuccess?.();
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if ((apiError.status === 400 || apiError.status === 422) && apiError.data?.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.data.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0];
          }
        });
        form.setErrors(fieldErrors as unknown as FormikErrors<OrganizationValues & TExtra>);
        return;
      }
      if (apiError.status === 429) return;
      setGeneralError(
        apiError.data?.message || apiError.message || 'Unable to save. Please try again.',
      );
    }
  };

  const form: FormikProps<OrganizationValues & TExtra> = useFormik<OrganizationValues & TExtra>({
    initialValues: merged,
    enableReinitialize: true,
    validationSchema,
    onSubmit: submit,
  });

  const showFieldError = (field: keyof OrganizationValues) =>
    form.submitCount > 0 && Boolean(form.errors[field]);

  return (
    <Form onSubmit={(e) => form.handleSubmit(e)}>
      <FormLabel htmlFor="organization-name">
        {showFieldError('name') ? (
          <p className="error">{form.errors.name as string}</p>
        ) : (
          <p>Organization Name</p>
        )}
      </FormLabel>
      <FormControl
        id="organization-name"
        type="text"
        maxLength={nameMaxLength}
        value={form.values.name}
        disabled={form.isSubmitting}
        onInput={(e) => form.setFieldValue('name', e.currentTarget.value)}
      />

      {additionalFields ? additionalFields(form) : null}

      <Button type="submit" disabled={form.isSubmitting}>
        {form.isSubmitting ? (
          <>
            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />{' '}
            Saving…
          </>
        ) : (
          (submitLabel ?? 'Save')
        )}
      </Button>

      {generalError && <p className="error">{generalError}</p>}
    </Form>
  );
}

export default OrganizationForm;
