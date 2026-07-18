import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChangePasswordForm from './index';

describe('ChangePasswordForm', () => {
  test('renders new-password + confirm fields', () => {
    render(<ChangePasswordForm onSubmit={jest.fn()} />);
    expect(screen.getByText('New Password')).toBeInTheDocument();
    expect(screen.getByText('Confirm New Password')).toBeInTheDocument();
  });

  test('surfaces a mismatch error and does not call onSubmit', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { container } = render(<ChangePasswordForm onSubmit={onSubmit} />);
    const [pw, confirm] = Array.from(container.querySelectorAll('input'));

    await userEvent.type(pw, 'password1');
    await userEvent.type(confirm, 'different1');
    await userEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('Passwords must match')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('calls onSubmit with the password when valid, then resets + onSuccess', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    const { container } = render(<ChangePasswordForm onSubmit={onSubmit} onSuccess={onSuccess} />);
    const [pw, confirm] = Array.from(container.querySelectorAll('input'));

    await userEvent.type(pw, 'password1');
    await userEvent.type(confirm, 'password1');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('password1'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  test('maps a 400 { errors } response onto the password field', async () => {
    const onSubmit = jest
      .fn()
      .mockRejectedValue({ status: 400, data: { errors: { password: ['Too weak'] } } });
    const { container } = render(<ChangePasswordForm onSubmit={onSubmit} />);
    const [pw, confirm] = Array.from(container.querySelectorAll('input'));

    await userEvent.type(pw, 'password1');
    await userEvent.type(confirm, 'password1');
    await userEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('Too weak')).toBeInTheDocument();
  });
});
