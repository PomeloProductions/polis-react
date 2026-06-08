import { ReactNode, useState } from 'react';
import { Button, Form, FormCheck, FormControl, FormLabel, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FormikErrors, FormikProps, useFormik } from 'formik';
import * as Yup from 'yup';
import AuthRequests, { SignUpData } from '../../../services/requests/AuthRequests';

/**
 * The base values every SignUpForm submission carries.
 *
 * Consumers can extend the form with additional fields via the
 * `additionalInitialValues` + `additionalFields` props. Those extra
 * fields show up alongside these in the Formik values, but the package
 * always owns these four.
 */
export interface SignUpValues {
    email: string;
    password: string;
    password_confirmation: string;
    accept_terms: boolean;
}

interface ApiError {
    status?: number;
    message?: string;
    data?: {
        errors?: Record<string, string[]>;
        message?: string;
    };
}

export interface SignUpFormProps<TExtra extends Record<string, unknown> = Record<string, never>> {
    /**
     * Render additional fields below the standard email + password +
     * confirmation + accept-terms fields. Receives the full Formik bag
     * so consumers can read values, set fields, inspect errors/touched,
     * etc.
     */
    additionalFields?: (formik: FormikProps<SignUpValues & TExtra>) => ReactNode;
    /**
     * Yup schema merged into the base validation schema. Should describe
     * only the consumer's extra fields — the base fields are validated
     * by the package.
     */
    additionalValidation?: Yup.AnySchema;
    /**
     * Initial values for the consumer's extra fields. Merged with the
     * base `{ email, password, password_confirmation, accept_terms }`.
     */
    additionalInitialValues?: TExtra;
    /**
     * Optional transform run on the merged values before they're sent
     * to `/auth/sign-up`. Use to rename fields, drop client-only state,
     * or coerce types.
     */
    additionalSubmitTransform?: (values: SignUpValues & TExtra) => unknown;
    /**
     * Destination after a successful signup. Defaults to '/'.
     */
    onSuccessRedirect?: string;
}

function SignUpForm<TExtra extends Record<string, unknown> = Record<string, never>>({
    additionalFields,
    additionalValidation,
    additionalInitialValues,
    additionalSubmitTransform,
    onSuccessRedirect,
}: SignUpFormProps<TExtra>) {
    const navigate = useNavigate();
    const [generalError, setGeneralError] = useState<string | null>(null);

    const baseSchema = Yup.object().shape({
        email: Yup.string().email('Must be a valid email').required('Email is required'),
        password: Yup.string()
            .min(8, 'Password must be at least 8 characters')
            .required('Password is required'),
        password_confirmation: Yup.string()
            .oneOf([Yup.ref('password')], 'Passwords must match')
            .required('Please confirm your password'),
        accept_terms: Yup.boolean()
            .oneOf([true], 'You must accept the terms to continue')
            .required('You must accept the terms to continue'),
    });

    const validationSchema = additionalValidation
        ? baseSchema.concat(additionalValidation as Yup.AnyObjectSchema)
        : baseSchema;

    const initialValues = {
        email: '',
        password: '',
        password_confirmation: '',
        accept_terms: false,
        ...(additionalInitialValues || ({} as TExtra)),
    } as SignUpValues & TExtra;

    const submit = async (values: SignUpValues & TExtra) => {
        setGeneralError(null);

        const transformed = additionalSubmitTransform
            ? additionalSubmitTransform(values)
            : values;

        try {
            await AuthRequests.signUp(transformed as SignUpData);
            navigate(onSuccessRedirect ?? '/');
        } catch (error: unknown) {
            const apiError = error as ApiError;
            // 422 — validation errors keyed by field name
            if (apiError.status === 422 && apiError.data?.errors) {
                const fieldErrors: Record<string, string> = {};
                Object.entries(apiError.data.errors).forEach(([field, messages]) => {
                    if (Array.isArray(messages) && messages.length > 0) {
                        fieldErrors[field] = messages[0];
                    }
                });
                form.setErrors(fieldErrors as unknown as FormikErrors<SignUpValues & TExtra>);
                return;
            }
            // 429 already toasted by api.ts
            if (apiError.status === 429) return;
            setGeneralError(
                apiError.data?.message || apiError.message || 'Unable to create account. Please try again.'
            );
        }
    };

    const form: FormikProps<SignUpValues & TExtra> = useFormik<SignUpValues & TExtra>({
        initialValues,
        validationSchema,
        onSubmit: submit,
    });

    const showFieldError = (field: keyof SignUpValues) =>
        form.submitCount > 0 && Boolean(form.errors[field]);

    return (
        <Form onSubmit={(e) => form.handleSubmit(e)}>
            <FormLabel htmlFor="signup-email">
                {showFieldError('email') ? (
                    <p className="error">{form.errors.email as string}</p>
                ) : (
                    <p>Email</p>
                )}
            </FormLabel>
            <FormControl
                id="signup-email"
                type="email"
                autoComplete="email"
                value={form.values.email}
                disabled={form.isSubmitting}
                onInput={(e) => form.setFieldValue('email', e.currentTarget.value)}
            />

            <FormLabel htmlFor="signup-password">
                {showFieldError('password') ? (
                    <p className="error">{form.errors.password as string}</p>
                ) : (
                    <p>Password</p>
                )}
            </FormLabel>
            <FormControl
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={form.values.password}
                disabled={form.isSubmitting}
                onInput={(e) => form.setFieldValue('password', e.currentTarget.value)}
            />

            <FormLabel htmlFor="signup-password-confirm">
                {showFieldError('password_confirmation') ? (
                    <p className="error">{form.errors.password_confirmation as string}</p>
                ) : (
                    <p>Confirm Password</p>
                )}
            </FormLabel>
            <FormControl
                id="signup-password-confirm"
                type="password"
                autoComplete="new-password"
                value={form.values.password_confirmation}
                disabled={form.isSubmitting}
                onInput={(e) =>
                    form.setFieldValue('password_confirmation', e.currentTarget.value)
                }
            />

            {additionalFields ? additionalFields(form) : null}

            <FormCheck
                id="signup-accept-terms"
                type="checkbox"
                className="mt-2"
                label="I accept the terms of use"
                checked={form.values.accept_terms}
                disabled={form.isSubmitting}
                onChange={(e) => form.setFieldValue('accept_terms', e.currentTarget.checked)}
            />
            {showFieldError('accept_terms') && (
                <p className="error">{form.errors.accept_terms as string}</p>
            )}

            <p>
                Already have an account? <Link to="/sign-in">Sign in</Link>
            </p>

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
                        Creating account…
                    </>
                ) : (
                    'Sign Up'
                )}
            </Button>

            {generalError && <p className="error">{generalError}</p>}
        </Form>
    );
}

export default SignUpForm;
