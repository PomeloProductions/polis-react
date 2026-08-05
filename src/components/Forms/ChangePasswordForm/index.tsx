import React, { ReactNode, useState } from 'react';
import { Button, Form, FormControl, FormGroup, FormLabel, Spinner } from 'react-bootstrap';
import { FormikErrors, FormikProps, useFormik } from 'formik';
import * as Yup from 'yup';

/**
 * The values a ChangePasswordForm submission carries.
 */
export interface ChangePasswordValues {
  password: string;
  password_confirmation: string;
}

interface ApiError {
  status?: number;
  message?: string;
  data?: {
    errors?: Record<string, string[]>;
    message?: string;
  };
}

export interface ChangePasswordFormProps {
  /**
   * Called with the new password when the form validates + submits. This is
   * where the consumer wires the actual API call (e.g.
   * `AuthRequests.updatePassword(me.id, password)`). The form stays
   * presentational and Redux/API-agnostic — exactly like the auth forms take
   * behavior via props rather than reaching into a store.
   *
   * Throw to surface an error: a `{ status: 400|422, data: { errors } }`
   * shape maps errors onto the matching fields; anything else shows a general
   * error message.
   */
  onSubmit: (password: string) => Promise<void>;
  /**
   * Minimum password length enforced client-side. Defaults to 6 (matches the
   * Athenia `UserController@update` password rule).
   */
  minLength?: number;
  /**
   * Render-prop for additional fields below password + confirmation. Receives
   * the full Formik bag.
   */
  additionalFields?: (formik: FormikProps<ChangePasswordValues>) => ReactNode;
  /**
   * Yup schema merged into the base validation schema (min length + match).
   * Should describe only the consumer's extra fields.
   */
  additionalValidation?: Yup.AnySchema;
  /**
   * Called after a successful submit (form values are already reset). Use to
   * toast, redirect, etc.
   */
  onSuccess?: () => void;
  /**
   * Label for the submit button. Defaults to "Update password".
   */
  submitLabel?: string;
}

/**
 * Presentational change-password form. Collects a new password + confirmation,
 * matches them client-side for typo safety, and hands the password to the
 * consumer's `onSubmit`. Mirrors `ResetPasswordForm`: formik + yup +
 * react-bootstrap, no direct API/Redux coupling.
 *
 * NOTE: the Athenia `PUT /v1/users/{id}` route does not verify a current
 * password, so this form intentionally does not collect one.
 */
const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  onSubmit,
  minLength = 6,
  additionalFields,
  additionalValidation,
  onSuccess,
  submitLabel,
}) => {
  const [generalError, setGeneralError] = useState<string | null>(null);

  const baseSchema = Yup.object().shape({
    password: Yup.string()
      .min(minLength, `Password must be at least ${minLength} characters`)
      .required('Password is required'),
    password_confirmation: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Please confirm your password'),
  });

  const validationSchema = additionalValidation
    ? baseSchema.concat(additionalValidation as Yup.AnyObjectSchema)
    : baseSchema;

  const submit = async (values: ChangePasswordValues) => {
    setGeneralError(null);
    try {
      await onSubmit(values.password);
      form.resetForm();
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
        form.setErrors(fieldErrors as FormikErrors<ChangePasswordValues>);
        return;
      }
      if (apiError.status === 429) return;
      setGeneralError(
        apiError.data?.message ||
          apiError.message ||
          'Unable to update password. Please try again.',
      );
    }
  };

  const form: FormikProps<ChangePasswordValues> = useFormik<ChangePasswordValues>({
    initialValues: {
      password: '',
      password_confirmation: '',
    },
    validationSchema,
    onSubmit: submit,
  });

  const showFieldError = (field: keyof ChangePasswordValues) =>
    form.submitCount > 0 && Boolean(form.errors[field]);

  return (
    <Form onSubmit={(e) => form.handleSubmit(e)} className="d-flex flex-column gap-3">
      <FormGroup controlId="change-password">
        <FormLabel className="mb-1">
          {showFieldError('password') ? (
            <span className="error">{form.errors.password as string}</span>
          ) : (
            'New Password'
          )}
        </FormLabel>
        <FormControl
          type="password"
          autoComplete="new-password"
          value={form.values.password}
          disabled={form.isSubmitting}
          onInput={(e) => form.setFieldValue('password', e.currentTarget.value)}
        />
      </FormGroup>

      <FormGroup controlId="change-password-confirm">
        <FormLabel className="mb-1">
          {showFieldError('password_confirmation') ? (
            <span className="error">{form.errors.password_confirmation as string}</span>
          ) : (
            'Confirm New Password'
          )}
        </FormLabel>
        <FormControl
          type="password"
          autoComplete="new-password"
          value={form.values.password_confirmation}
          disabled={form.isSubmitting}
          onInput={(e) => form.setFieldValue('password_confirmation', e.currentTarget.value)}
        />
      </FormGroup>

      {additionalFields ? additionalFields(form) : null}

      <div className="d-flex justify-content-end">
        <Button type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />{' '}
              Updating…
            </>
          ) : (
            (submitLabel ?? 'Update password')
          )}
        </Button>
      </div>

      {generalError && <p className="error mb-0">{generalError}</p>}
    </Form>
  );
};

export default ChangePasswordForm;
