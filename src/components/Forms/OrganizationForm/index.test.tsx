import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrganizationForm from './index';

describe('OrganizationForm', () => {
  test('renders the name field with initial value', () => {
    const { container } = render(
      <OrganizationForm onSubmit={jest.fn()} initialValues={{ name: 'Acme' }} />,
    );
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('Acme');
  });

  test('requires a name', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<OrganizationForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('submits the trimmed name', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { container } = render(<OrganizationForm onSubmit={onSubmit} />);
    await userEvent.type(container.querySelector('input') as HTMLInputElement, '  Acme  ');
    await userEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Acme' }));
  });

  test('maps a 400 { errors } response onto the name field', async () => {
    const onSubmit = jest
      .fn()
      .mockRejectedValue({ status: 400, data: { errors: { name: ['Taken'] } } });
    const { container } = render(<OrganizationForm onSubmit={onSubmit} />);
    await userEvent.type(container.querySelector('input') as HTMLInputElement, 'Acme');
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Taken')).toBeInTheDocument();
  });
});
