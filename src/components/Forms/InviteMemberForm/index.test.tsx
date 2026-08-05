import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InviteMemberForm from './index';

describe('InviteMemberForm', () => {
  test('renders email + role fields with the default roles', () => {
    render(<InviteMemberForm onSubmit={jest.fn()} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    // Default roles: ADMINISTRATOR ("Owner") + MANAGER ("Manager").
    expect(screen.getByRole('option', { name: 'Owner' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Manager' })).toBeInTheDocument();
  });

  test('requires a valid email and does not call onSubmit', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<InviteMemberForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('submits { email, role_id } when valid, then resets + onSuccess', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    const { container } = render(<InviteMemberForm onSubmit={onSubmit} onSuccess={onSuccess} />);

    await userEvent.type(container.querySelector('input') as HTMLInputElement, 'invitee@x.com');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: 'invitee@x.com', role_id: 10 }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  test('maps a 422 { errors } response onto the email field', async () => {
    const onSubmit = jest
      .fn()
      .mockRejectedValue({ status: 422, data: { errors: { email: ['Already invited'] } } });
    const { container } = render(<InviteMemberForm onSubmit={onSubmit} />);
    await userEvent.type(container.querySelector('input') as HTMLInputElement, 'invitee@x.com');
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Already invited')).toBeInTheDocument();
  });
});
