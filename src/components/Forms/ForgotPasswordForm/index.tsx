import React, { ReactNode, useState } from 'react';
import { Button, Form, FormControl, FormLabel, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FormikErrors, FormikProps, useFormik } from 'formik';
import * as Yup from 'yup';
import ResetPasswordRequests from '../../../services/requests/ResetPasswordRequests';

export interface ForgotPasswordValues {
    email: string;
}

interface ApiError {
    status?: number;
    message?: string;
    data?: {
        errors?: Record<string, string[]>;
        message?: string;
    };
}

export interface ForgotPasswordFormProps {
    /**
     * Optional render-prop for adding extra fields below the email field.
     * Receives the full Formik bag.
     */
    additionalFields?: (formik: FormikProps<ForgotPasswordValues>) => ReactNode;
    /**
     * Yup schema merged into the base validation schema (which validates
     * `email`). Should describe only the consumer's extra fields.
     */
    additionalValidation?: Yup.AnySchema;
    /**
     * Destination after a successful submission. If omitted, the form
     * shows an inline confirmation message instead of navigating.
     */
    onSuccessRedirect?: string;
    /**
     * Message shown in the inline confirmation panel. Defaults to a
     * generic "check your email" string.
     */
    successMessage?: string;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
    additionalFields,
    additionalValidation,
    onSuccessRedirect,
    successMessage,
}) => {
    const navigate = useNavigate();
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const baseSchema = Yup.object().shape({
        email: Yup.string().email('Must be a valid email').required('Email is required'),
    });

    const validationSchema = additionalValidation
        ? baseSchema.concat(additionalValidation as Yup.AnyObjectSchema)
        : baseSchema;

    const submit = async (values: ForgotPasswordValues) => {
        setGeneralError(null);
        try {
            await ResetPasswordRequests.forgotPassword(values.email);
            if (onSuccessRedirect) {
                navigate(onSuccessRedirect);
            } else {
                setSubmitted(true);
            }
        } catch (error: unknown) {
            const apiError = error as ApiError;
            if (apiError.status === 422 && apiError.data?.errors) {
                const fieldErrors: Record<string, string> = {};
                Object.entries(apiError.data.errors).forEach(([field, messages]) => {
                    if (Array.isArray(messages) && messages.length > 0) {
                        fieldErrors[field] = messages[0];
                    }
                });
                form.setErrors(fieldErrors as FormikErrors<ForgotPasswordValues>);
                return;
            }
            if (apiError.status === 429) return;
            setGeneralError(
                apiError.data?.message || apiError.message || 'Unable to send reset link. Please try again.'
            );
        }
    };

    const form: FormikProps<ForgotPasswordValues> = useFormik<ForgotPasswordValues>({
        initialValues: { email: '' },
        validationSchema,
        onSubmit: submit,
    });

    if (submitted) {
        return (
            <div role="status">
                <p>
                    {successMessage ||
                        "If an account exists for that email, we've sent a password reset link. Check your inbox."}
                </p>
            </div>
        );
    }

    const showFieldError = (field: keyof ForgotPasswordValues) =>
        form.submitCount > 0 && Boolean(form.errors[field]);

    return (
        <Form onSubmit={(e) => form.handleSubmit(e)}>
            <FormLabel htmlFor="forgot-email">
                {showFieldError('email') ? (
                    <p className="error">{form.errors.email as string}</p>
                ) : (
                    <p>Email</p>
                )}
            </FormLabel>
            <FormControl
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={form.values.email}
                disabled={form.isSubmitting}
                onInput={(e) => form.setFieldValue('email', e.currentTarget.value)}
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
                        Sending…
                    </>
                ) : (
                    'Send reset link'
                )}
            </Button>

            {generalError && <p className="error">{generalError}</p>}
        </Form>
    );
};

export default ForgotPasswordForm;
