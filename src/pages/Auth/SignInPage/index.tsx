import React, { ReactNode } from 'react';
import { Anchor, Center, Container, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import SignInForm from '../../../components/Forms/SignInForm';

export interface AuthPageBranding {
    /**
     * App name shown in headings. Defaults to "Polis".
     */
    appName?: string;
    /**
     * Optional logo node rendered above the heading.
     */
    logo?: ReactNode;
}

export interface SignInPageProps {
    /**
     * App-specific branding (name + logo). Optional.
     */
    branding?: AuthPageBranding;
    /**
     * Override the destination after a successful sign-in. Forwarded to
     * `SignInForm` as `defaultRedirect`.
     */
    defaultRedirect?: string;
}

/**
 * Default sign-in page composition. Wraps `<SignInForm />` in a centered
 * Mantine `<Paper>` with cross-links to forgot-password and sign-up.
 * Consumers can use as-is or copy-and-customize.
 */
const SignInPage: React.FC<SignInPageProps> = ({ branding, defaultRedirect }) => {
    const appName = branding?.appName ?? 'Polis';

    return (
        <Container size="xs" py="xl">
            <Center mb="lg">{branding?.logo}</Center>
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Stack gap="md">
                    <Title order={2}>Sign in to {appName}</Title>
                    <Text c="dimmed" size="sm">
                        Enter your email and password to continue.
                    </Text>
                    <SignInForm defaultRedirect={defaultRedirect} />
                    <Stack gap="xs" mt="md">
                        <Text size="sm">
                            <Anchor component={Link} to="/forgot-password">
                                Forgot your password?
                            </Anchor>
                        </Text>
                        <Text size="sm">
                            Need an account?{' '}
                            <Anchor component={Link} to="/sign-up">
                                Sign up
                            </Anchor>
                        </Text>
                    </Stack>
                </Stack>
            </Paper>
        </Container>
    );
};

export default SignInPage;
