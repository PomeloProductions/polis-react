import React, { useState } from 'react';
import { Anchor, Alert, Center, Container, Paper, Stack, Text, Title } from '@mantine/core';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Form, FormControl, FormLabel, Spinner } from 'react-bootstrap';
import { FormikErrors, FormikProps, useFormik } from 'formik';
import * as Yup from 'yup';
import AuthRequests, { SignUpData } from '../../../services/requests/AuthRequests';
import { AuthPageBranding } from '../SignInPage';

interface ApiError {
  status?: number;
  message?: string;
  data?: {
    errors?: Record<string, string[]>;
    message?: string;
  };
}

interface AcceptInvitationValues {
  email: string;
  password: string;
  password_confirmation: string;
}

export interface AcceptInvitationPageProps {
  /**
   * App-specific branding (name + logo). Optional.
   */
  branding?: AuthPageBranding;
  /**
   * The query-param name the invitation token is read from. Defaults to
   * `invitation_token` (matches `INVITATION_ACCEPT_URL_BASE?invitation_token=`).
   */
  tokenParam?: string;
  /**
   * The query-param name a prefilled email is read from. Defaults to `email`.
   * When present the email field is prefilled and read-only.
   */
  emailParam?: string;
  /**
   * Minimum password length. Defaults to 8 (matches SignUpForm).
   */
  minLength?: number;
  /**
   * Destination after a successful activation. Defaults to '/'.
   */
  onSuccessRedirect?: string;
  /**
   * Override the sign-up call. Defaults to `AuthRequests.signUp` (which stores
   * the returned token, logging the newly-activated user in). Wire this to
   * `POST /auth/sign-up` with `{ email, password, invitation_token }`.
   */
  onAccept?: (data: SignUpData) => Promise<unknown>;
}

/**
 * Accept-invitation page. The invitation email links here with
 * `?invitation_token=…` (see `INVITATION_ACCEPT_URL_BASE`). The invitee sets a
 * password and submits; this activates the account by signing up with the
 * token via `POST /auth/sign-up` ({ email, password, invitation_token }), which
 * attaches them to the inviting organization as a manager.
 *
 * Mirrors `SignUpPage`: a centered Mantine `<Paper>` wrapping a formik + yup +
 * react-bootstrap set-password form.
 */
const AcceptInvitationPage: React.FC<AcceptInvitationPageProps> = ({
  branding,
  tokenParam = 'invitation_token',
  emailParam = 'email',
  minLength = 8,
  onSuccessRedirect,
  onAccept,
}) => {
  const appName = branding?.appName ?? 'Polis';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const invitationToken = searchParams.get(tokenParam) ?? '';
  const prefilledEmail = searchParams.get(emailParam) ?? '';

  const accept = onAccept ?? AuthRequests.signUp;

  const validationSchema = Yup.object().shape({
    email: Yup.string().email('Must be a valid email').required('Email is required'),
    password: Yup.string()
      .min(minLength, `Password must be at least ${minLength} characters`)
      .required('Password is required'),
    password_confirmation: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Please confirm your password'),
  });

  const submit = async (values: AcceptInvitationValues) => {
    setGeneralError(null);
    try {
      await accept({
        email: values.email,
        password: values.password,
        first_name: '',
        last_name: '',
        invitation_token: invitationToken,
      });
      navigate(onSuccessRedirect ?? '/');
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if ((apiError.status === 400 || apiError.status === 422) && apiError.data?.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.data.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[field] = messages[0];
          }
        });
        form.setErrors(fieldErrors as FormikErrors<AcceptInvitationValues>);
        return;
      }
      if (apiError.status === 429) return;
      setGeneralError(
        apiError.data?.message ||
          apiError.message ||
          'Unable to accept the invitation. Please try again.',
      );
    }
  };

  const form: FormikProps<AcceptInvitationValues> = useFormik<AcceptInvitationValues>({
    initialValues: {
      email: prefilledEmail,
      password: '',
      password_confirmation: '',
    },
    validationSchema,
    onSubmit: submit,
  });

  const showFieldError = (field: keyof AcceptInvitationValues) =>
    form.submitCount > 0 && Boolean(form.errors[field]);

  return (
    <Container size="xs" py="xl">
      <Center mb="lg">{branding?.logo}</Center>
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="md">
          <Title order={2}>Accept your {appName} invitation</Title>
          <Text c="dimmed" size="sm">
            Set a password to activate your account and join the organization.
          </Text>

          {!invitationToken && (
            <Alert color="red">
              This invitation link is missing its token. Please use the link from your invitation
              email.
            </Alert>
          )}

          <Form onSubmit={(e) => form.handleSubmit(e)}>
            <FormLabel htmlFor="accept-invitation-email">
              {showFieldError('email') ? (
                <p className="error">{form.errors.email as string}</p>
              ) : (
                <p>Email</p>
              )}
            </FormLabel>
            <FormControl
              id="accept-invitation-email"
              type="email"
              autoComplete="email"
              readOnly={Boolean(prefilledEmail)}
              value={form.values.email}
              disabled={form.isSubmitting}
              onInput={(e) => form.setFieldValue('email', e.currentTarget.value)}
            />

            <FormLabel htmlFor="accept-invitation-password">
              {showFieldError('password') ? (
                <p className="error">{form.errors.password as string}</p>
              ) : (
                <p>Password</p>
              )}
            </FormLabel>
            <FormControl
              id="accept-invitation-password"
              type="password"
              autoComplete="new-password"
              value={form.values.password}
              disabled={form.isSubmitting}
              onInput={(e) => form.setFieldValue('password', e.currentTarget.value)}
            />

            <FormLabel htmlFor="accept-invitation-password-confirm">
              {showFieldError('password_confirmation') ? (
                <p className="error">{form.errors.password_confirmation as string}</p>
              ) : (
                <p>Confirm Password</p>
              )}
            </FormLabel>
            <FormControl
              id="accept-invitation-password-confirm"
              type="password"
              autoComplete="new-password"
              value={form.values.password_confirmation}
              disabled={form.isSubmitting}
              onInput={(e) => form.setFieldValue('password_confirmation', e.currentTarget.value)}
            />

            <Button type="submit" disabled={form.isSubmitting || !invitationToken}>
              {form.isSubmitting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />{' '}
                  Activating…
                </>
              ) : (
                'Accept invitation'
              )}
            </Button>

            {generalError && <p className="error">{generalError}</p>}
          </Form>

          <Text size="sm" mt="md">
            Already have an account?{' '}
            <Anchor component={Link} to="/sign-in">
              Sign in
            </Anchor>
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
};

export default AcceptInvitationPage;
