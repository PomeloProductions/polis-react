import { Anchor, Center, Container, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import SignUpForm, { SignUpFormProps } from '../../../components/Forms/SignUpForm';
import { AuthPageBranding } from '../SignInPage';

export interface SignUpPageProps<
  TExtra extends Record<string, unknown> = Record<string, never>,
> extends SignUpFormProps<TExtra> {
  /**
   * App-specific branding (name + logo). Optional.
   */
  branding?: AuthPageBranding;
}

/**
 * Default sign-up page. Wraps `<SignUpForm />` in a centered Mantine
 * `<Paper>` and forwards all render-prop / validation props through to
 * the form.
 */
function SignUpPage<TExtra extends Record<string, unknown> = Record<string, never>>({
  branding,
  ...formProps
}: SignUpPageProps<TExtra>) {
  const appName = branding?.appName ?? 'Polis';

  return (
    <Container size="xs" py="xl">
      <Center mb="lg">{branding?.logo}</Center>
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="md">
          <Title order={2}>Create your {appName} account</Title>
          <Text c="dimmed" size="sm">
            Sign up to get started.
          </Text>
          <SignUpForm<TExtra> {...formProps} />
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
}

export default SignUpPage;
