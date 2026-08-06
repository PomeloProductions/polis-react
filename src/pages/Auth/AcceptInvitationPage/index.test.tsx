import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import userEvent from '@testing-library/user-event';
import AcceptInvitationPage from './index';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderPage = (
  route = '/accept-invitation?invitation_token=abc123&email=invitee@x.com',
  props: React.ComponentProps<typeof AcceptInvitationPage> = {},
) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <MantineProvider>
        <AcceptInvitationPage {...props} />
      </MantineProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  mockNavigate.mockReset();
});

describe('AcceptInvitationPage', () => {
  test('renders the heading and prefilled read-only email from the query', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /Accept your Polis invitation/i }),
    ).toBeInTheDocument();
    const email = screen.getByDisplayValue('invitee@x.com') as HTMLInputElement;
    expect(email.readOnly).toBe(true);
  });

  test('warns and disables submit when the token is missing', () => {
    renderPage('/accept-invitation');
    expect(screen.getByText(/missing its token/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept invitation/i })).toBeDisabled();
  });

  test('signs up with { email, password, invitation_token } and redirects', async () => {
    const onAccept = jest.fn().mockResolvedValue(true);
    renderPage('/accept-invitation?invitation_token=abc123&email=invitee@x.com', { onAccept });

    const inputs = Array.from(document.querySelectorAll('input'));
    // [email, password, confirm]
    await userEvent.type(inputs[1], 'password1');
    await userEvent.type(inputs[2], 'password1');
    await userEvent.click(screen.getByRole('button', { name: /Accept invitation/i }));

    await waitFor(() =>
      expect(onAccept).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'invitee@x.com',
          password: 'password1',
          invitation_token: 'abc123',
        }),
      ),
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });
});
