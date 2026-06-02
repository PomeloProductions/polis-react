import React, { ReactNode } from 'react';
import { Button, Center, Container, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { AuthPageBranding } from '../Auth/SignInPage';

export interface WelcomePageProps {
    branding?: AuthPageBranding;
    /**
     * Optional copy slot rendered between the heading and the action
     * buttons. Use it for an app-specific tagline or feature list.
     */
    children?: ReactNode;
    /**
     * Override the sign-in destination. Defaults to `/sign-in`.
     */
    signInTo?: string;
    /**
     * Override the sign-up destination. Defaults to `/sign-up`.
     */
    signUpTo?: string;
}

/**
 * Default welcome / landing page for logged-out visitors. Shows the
 * app name, an optional copy slot, and sign-in + sign-up buttons.
 */
const WelcomePage: React.FC<WelcomePageProps> = ({
    branding,
    children,
    signInTo,
    signUpTo,
}) => {
    const appName = branding?.appName ?? 'Polis';

    return (
        <Container size="sm" py="xl">
            <Center mb="lg">{branding?.logo}</Center>
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Stack gap="lg" align="center">
                    <Title order={1} ta="center">
                        Welcome to {appName}
                    </Title>
                    {children ? (
                        <Stack gap="sm" align="center">
                            {children}
                        </Stack>
                    ) : (
                        <Text c="dimmed" ta="center">
                            Sign in to your account or create a new one to get started.
                        </Text>
                    )}
                    <Group justify="center" mt="md">
                        <Button component={Link} to={signInTo ?? '/sign-in'} variant="filled">
                            Sign in
                        </Button>
                        <Button component={Link} to={signUpTo ?? '/sign-up'} variant="outline">
                            Sign up
                        </Button>
                    </Group>
                </Stack>
            </Paper>
        </Container>
    );
};

export default WelcomePage;
