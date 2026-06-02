import React from 'react';
import { Anchor, Center, Container, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import ForgotPasswordForm, {
    ForgotPasswordFormProps,
} from '../../../components/Forms/ForgotPasswordForm';
import { AuthPageBranding } from '../SignInPage';

export interface ForgotPasswordPageProps extends ForgotPasswordFormProps {
    branding?: AuthPageBranding;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ branding, ...formProps }) => {
    const appName = branding?.appName ?? 'Polis';

    return (
        <Container size="xs" py="xl">
            <Center mb="lg">{branding?.logo}</Center>
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Stack gap="md">
                    <Title order={2}>Forgot your password?</Title>
                    <Text c="dimmed" size="sm">
                        Enter the email associated with your {appName} account and we'll send you a
                        reset link.
                    </Text>
                    <ForgotPasswordForm {...formProps} />
                    <Text size="sm" mt="md">
                        Remembered it?{' '}
                        <Anchor component={Link} to="/sign-in">
                            Back to sign in
                        </Anchor>
                    </Text>
                </Stack>
            </Paper>
        </Container>
    );
};

export default ForgotPasswordPage;
