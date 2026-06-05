import React from 'react';
import { Anchor, Center, Container, Paper, Stack, Text, Title } from '@mantine/core';
import { Link, useSearchParams } from 'react-router-dom';
import ResetPasswordForm, {
    ResetPasswordFormProps,
} from '../../../components/Forms/ResetPasswordForm';
import { AuthPageBranding } from '../SignInPage';

export interface ResetPasswordPageProps
    extends Omit<ResetPasswordFormProps, 'token' | 'email'> {
    branding?: AuthPageBranding;
    /**
     * If omitted, token + email are read from the URL query string
     * (`?token=...&email=...`). Pass explicitly to override.
     */
    token?: string;
    email?: string;
}

/**
 * Default reset-password page. Reads the reset token + email from the
 * URL by default (override with the `token` / `email` props if your
 * routing puts them elsewhere). Wraps `<ResetPasswordForm />` in a
 * Mantine `<Paper>`.
 */
const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
    branding,
    token: tokenOverride,
    email: emailOverride,
    ...formProps
}) => {
    const [searchParams] = useSearchParams();
    const token = tokenOverride ?? searchParams.get('token') ?? '';
    const email = emailOverride ?? searchParams.get('email') ?? '';
    const appName = branding?.appName ?? 'Polis';

    return (
        <Container size="xs" py="xl">
            <Center mb="lg">{branding?.logo}</Center>
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Stack gap="md">
                    <Title order={2}>Reset your {appName} password</Title>
                    {!token || !email ? (
                        <Text c="red" size="sm">
                            This reset link is missing a token or email. Please request a new one.
                        </Text>
                    ) : (
                        <>
                            <Text c="dimmed" size="sm">
                                Choose a new password for <strong>{email}</strong>.
                            </Text>
                            <ResetPasswordForm token={token} email={email} {...formProps} />
                        </>
                    )}
                    <Text size="sm" mt="md">
                        <Anchor component={Link} to="/sign-in">
                            Back to sign in
                        </Anchor>
                    </Text>
                </Stack>
            </Paper>
        </Container>
    );
};

export default ResetPasswordPage;
