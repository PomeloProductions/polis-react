import React, { useState } from 'react';
import { Button, Form, FormControl, FormLabel, FormSelect, Spinner } from 'react-bootstrap';
import { FormikErrors, FormikProps, useFormik } from 'formik';
import * as Yup from 'yup';
import { AvailableRoles, getRoleName } from '../../../models/role';

/**
 * The values an InviteMemberForm submission carries.
 */
export interface InviteMemberValues {
  email: string;
  role_id: number;
}

interface ApiError {
  status?: number;
  message?: string;
  data?: {
    errors?: Record<string, string[]>;
    message?: string;
  };
}

/**
 * The roles a member may be invited at. Defaults to ADMINISTRATOR + MANAGER —
 * the two org-manager roles from polis-laravel.
 */
export const DEFAULT_INVITE_ROLES: AvailableRoles[] = [
  AvailableRoles.Administrator,
  AvailableRoles.Manager,
];

export interface InviteMemberFormProps {
  /**
   * Called with the invitee's email + role id when the form validates +
   * submits. The consumer wires the actual API call here (e.g.
   * `OrganizationRequests.inviteOrganizationManager(orgId, values)`). The form
   * stays presentational — no direct API/Redux coupling, mirroring the auth +
   * settings forms.
   *
   * Throw to surface an error: a `{ status: 400|422, data: { errors } }` shape
   * maps errors onto the matching fields; anything else shows a general error.
   */
  onSubmit: (values: InviteMemberValues) => Promise<void>;
  /**
   * The roles offered in the select. Defaults to {@link DEFAULT_INVITE_ROLES}
   * (ADMINISTRATOR + MANAGER).
   */
  roles?: AvailableRoles[];
  /**
   * Called after a successful submit (form values are already reset). Use to
   * toast, refresh the member list, etc.
   */
  onSuccess?: () => void;
  /**
   * Label for the submit button. Defaults to "Send invitation".
   */
  submitLabel?: string;
}

/**
 * Presentational invite-member form. Collects an email + a role and hands them
 * to the consumer's `onSubmit`, which posts to the organization-managers
 * endpoint. Mirrors `ChangePasswordForm` / `OrganizationForm`: formik + yup +
 * react-bootstrap, no direct API/Redux coupling.
 */
const InviteMemberForm: React.FC<InviteMemberFormProps> = ({
  onSubmit,
  roles = DEFAULT_INVITE_ROLES,
  onSuccess,
  submitLabel,
}) => {
  const [generalError, setGeneralError] = useState<string | null>(null);

  const roleOptions = roles.length > 0 ? roles : DEFAULT_INVITE_ROLES;

  const validationSchema = Yup.object().shape({
    email: Yup.string().email('Must be a valid email').required('Email is required'),
    role_id: Yup.number().oneOf(roleOptions, 'Select a role').required('Role is required'),
  });

  const submit = async (values: InviteMemberValues) => {
    setGeneralError(null);
    try {
      await onSubmit(values);
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
        form.setErrors(fieldErrors as FormikErrors<InviteMemberValues>);
        return;
      }
      if (apiError.status === 429) return;
      setGeneralError(
        apiError.data?.message ||
          apiError.message ||
          'Unable to send invitation. Please try again.',
      );
    }
  };

  const form: FormikProps<InviteMemberValues> = useFormik<InviteMemberValues>({
    initialValues: {
      email: '',
      role_id: roleOptions[0],
    },
    validationSchema,
    onSubmit: submit,
  });

  const showFieldError = (field: keyof InviteMemberValues) =>
    form.submitCount > 0 && Boolean(form.errors[field]);

  return (
    <Form onSubmit={(e) => form.handleSubmit(e)}>
      <FormLabel htmlFor="invite-member-email">
        {showFieldError('email') ? (
          <p className="error">{form.errors.email as string}</p>
        ) : (
          <p>Email</p>
        )}
      </FormLabel>
      <FormControl
        id="invite-member-email"
        type="email"
        autoComplete="email"
        value={form.values.email}
        disabled={form.isSubmitting}
        onInput={(e) => form.setFieldValue('email', e.currentTarget.value)}
      />

      <FormLabel htmlFor="invite-member-role">
        {showFieldError('role_id') ? (
          <p className="error">{form.errors.role_id as string}</p>
        ) : (
          <p>Role</p>
        )}
      </FormLabel>
      <FormSelect
        id="invite-member-role"
        value={form.values.role_id}
        disabled={form.isSubmitting}
        onChange={(e) => form.setFieldValue('role_id', Number(e.currentTarget.value))}
      >
        {roleOptions.map((role) => (
          <option key={role} value={role}>
            {getRoleName(role)}
          </option>
        ))}
      </FormSelect>

      <Button type="submit" disabled={form.isSubmitting}>
        {form.isSubmitting ? (
          <>
            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />{' '}
            Sending…
          </>
        ) : (
          (submitLabel ?? 'Send invitation')
        )}
      </Button>

      {generalError && <p className="error">{generalError}</p>}
    </Form>
  );
};

export default InviteMemberForm;
