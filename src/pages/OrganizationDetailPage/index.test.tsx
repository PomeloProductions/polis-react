import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import userEvent from '@testing-library/user-event';
import OrganizationDetailPage from './index';
import { AvailableRoles } from '../../models/role';

const org = { id: 7, name: 'Acme', email: 'a@x.com' };

const renderPage = (props: Partial<React.ComponentProps<typeof OrganizationDetailPage>> = {}) =>
  render(
    <MantineProvider>
      <OrganizationDetailPage
        organizationId={7}
        onFetchOrganization={jest.fn().mockResolvedValue(org)}
        onListMembers={jest.fn().mockResolvedValue({ data: [], total: 0 })}
        onListArticles={jest.fn().mockResolvedValue({ data: [], total: 0 })}
        onListPayments={jest.fn().mockResolvedValue({ data: [], total: 0 })}
        onInviteMember={jest.fn().mockResolvedValue({ id: 1 })}
        {...props}
      />
    </MantineProvider>,
  );

describe('OrganizationDetailPage', () => {
  test('renders the org name heading and the three built-in tabs', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Acme' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Users/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Contracts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Invoices/i })).toBeInTheDocument();
  });

  test('hides the invite form when the user cannot invite', async () => {
    renderPage({ me: { roles: [], organization_managers: [] } });
    await screen.findByRole('heading', { name: 'Acme' });
    expect(screen.queryByText('Invite a member')).not.toBeInTheDocument();
  });

  test('shows the invite form for a super admin', async () => {
    renderPage({ me: { roles: [{ id: AvailableRoles.SuperAdmin, name: 'Super' }] } });
    expect(await screen.findByText('Invite a member')).toBeInTheDocument();
  });

  test('renders an injected extra tab and its panel', async () => {
    renderPage({
      extraTabs: [
        { value: 'services', label: 'Services', render: () => <div>Services panel</div> },
      ],
    });
    const servicesTab = await screen.findByRole('tab', { name: /Services/i });
    await userEvent.click(servicesTab);
    expect(await screen.findByText('Services panel')).toBeInTheDocument();
  });
});
