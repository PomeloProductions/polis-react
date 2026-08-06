import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import userEvent from '@testing-library/user-event';
import OrganizationsPage from './index';

const orgs = [
  { id: 1, name: 'Acme', email: 'a@x.com', created_at: '2026-01-01' },
  { id: 2, name: 'Globex', email: 'g@x.com', created_at: '2026-02-01' },
];

const renderPage = (props: Partial<React.ComponentProps<typeof OrganizationsPage>> = {}) =>
  render(
    <MantineProvider>
      <OrganizationsPage
        onListOrganizations={jest
          .fn()
          .mockResolvedValue({ data: orgs, total: 2, current_page: 1, per_page: 50, last_page: 1 })}
        {...props}
      />
    </MantineProvider>,
  );

describe('OrganizationsPage', () => {
  test('lists organizations from the injected loader', async () => {
    renderPage();
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Globex')).toBeInTheDocument();
  });

  test('offers a View action and invokes onSelectOrganization when provided', async () => {
    const onSelect = jest.fn();
    renderPage({ onSelectOrganization: onSelect });
    await screen.findByText('Acme');
    const viewButtons = screen.getAllByRole('button', { name: 'View' });
    await userEvent.click(viewButtons[0]);
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 })));
  });

  test('shows no View action when onSelectOrganization is omitted', async () => {
    renderPage();
    await screen.findByText('Acme');
    expect(screen.queryByRole('button', { name: 'View' })).not.toBeInTheDocument();
  });
});
