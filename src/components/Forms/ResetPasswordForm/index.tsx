import React, { ReactNode, useState } from 'react';
import { Button, Form, FormControl, FormLabel, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FormikErrors, FormikProps, useFormik } from 'formik';
import * as Yup from 'yup';
import ResetPasswordRequests from '../../../services/requests/ResetPasswordRequests';

export interface ResetPasswordValues {
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

export interface ResetPasswordFormProps {
    /**
     * Reset token (typically extracted from the URL by the consumer).
     */
    token: string;
    /**
     * Email the reset was requested for (typically also in the URL).
     */
    email: string;
    /**
     * Optional render-prop for additional fields below password +
     * confirmation. Receives the full Formik bag.
     */
    additionalFields?: (formik: FormikProps<ResetPasswordValues>) => ReactNode;
    /**
     * Yup schema merged into the base validation schema (password match
     * + min length).
     */
    additionalValidation?: Yup.AnySchema;
    /**
     * Destination after a successful reset. Defaults to '/sign-in'.
     */
    onSuccessRedirect?: string;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
    token,
    email,
    additionalFields,
    additionalValidation,
    onSuccessRedirect,
}) => {
    const navigate = useNavigate();
    const [generalError, setGeneralError] = useState<string | null>(null);

    const baseSchema = Yup.object().shape({
        password: Yup.string()
            .min(8, 'Password must be at least 8 characters')
            .required('Password is required'),
        password_confirmation: Yup.string()
            .oneOf([Yup.ref('password')], 'Passwords must match')
            .required('Please confirm your password'),
    });

    const validationSchema = additionalValidation
        ? baseSchema.concat(additionalValidation as Yup.AnyObjectSchema)
        : baseSchema;

    const submit = async (values: ResetPasswordValues) => {
        setGeneralError(null);
        try {
            await ResetPasswordRequests.resetPassword(token, email, values.password);
            navigate(onSuccessRedirect ?? '/sign-in');
        } catch (error: unknown) {
            const apiError = error as ApiError;
            if (apiError.status === 422 && apiError.data?.errors) {
                const fieldErrors: Record<string, string> = {};
                Object.entries(apiError.data.errors).forEach(([field, messages]) => {
                    if (Array.isArray(messages) && messages.length > 0) {
                        fieldErrors[field] = messages[0];
                    }
                });
                form.setErrors(fieldErrors as FormikErrors<ResetPasswordValues>);
                return;
            }
            if (apiError.status === 429) return;
            setGeneralError(
                apiError.data?.message || apiError.message || 'Unable to reset password. Please try again.'
            );
        }
    };

    const form: FormikProps<ResetPasswordValues> = useFormik<ResetPasswordValues>({
        initialValues: {
            password: '',
            password_confirmation: '',
        },
        validationSchema,
        onSubmit: submit,
    });

    const showFieldError = (field: keyof ResetPasswordValues) =>
        form.submitCount > 0 && Boolean(form.errors[field]);

    return (
        <Form onSubmit={(e) => form.handleSubmit(e)}>
            <FormLabel htmlFor="reset-password">
                {showFieldError('password') ? (
                    <p className="error">{form.errors.password as string}</p>
                ) : (
                    <p>New Password</p>
                )}
            </FormLabel>
            <FormControl
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={form.values.password}
                disabled={form.isSubmitting}
                onInput={(e) => form.setFieldValue('password', e.currentTarget.value)}
            />

            <FormLabel htmlFor="reset-password-confirm">
                {showFieldError('password_confirmation') ? (
                    <p className="error">{form.errors.password_confirmation as string}</p>
                ) : (
                    <p>Confirm New Password</p>
                )}
            </FormLabel>
            <FormControl
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                value={form.values.password_confirmation}
                disabled={form.isSubmitting}
                onInput={(e) =>
                    form.setFieldValue('password_confirmation', e.currentTarget.value)
                }
            />

            {additionalFields ? additionalFields(form) : null}

            <Button type="submit" disabled={form.isSubmitting}>
                {form.isSubmitting ? (
                    <>
                        <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                        />{' '}
                        Resetting…
                    </>
                ) : (
                    'Reset Password'
                )}
            </Button>

            {generalError && <p className="error">{generalError}</p>}
        </Form>
    );
};

export default ResetPasswordForm;
