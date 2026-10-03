import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../../test-utils';
import SettingsPage from './index';
import { registerPlugin, resetPlugins } from '../../../plugins/registry';

const me = { id: 1, email: 'a@b.com', organization_managers: [] } as never;

describe('SettingsPage + plugin settings tabs', () => {
  beforeEach(() => resetPlugins());
  afterAll(() => resetPlugins());

  it('renders a plugin-registered settings tab', () => {
    registerPlugin({
      key: 'reports',
      settingsTabs: [{ value: 'reports', label: 'Reports', panel: <div>reports panel</div> }],
    });
    renderWithRouter(<SettingsPage me={me} showOrganizationTab={false} />);
    expect(screen.getByRole('tab', { name: /reports/i })).toBeInTheDocument();
  });

  it('is unchanged when no plugin tabs are registered (backwards-compatible)', () => {
    renderWithRouter(<SettingsPage me={me} showOrganizationTab={false} />);
    expect(screen.getByRole('tab', { name: /account/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /reports/i })).not.toBeInTheDocument();
  });

  it('prop extraTabs win over a plugin tab with the same value', () => {
    registerPlugin({
      key: 'reports',
      settingsTabs: [{ value: 'dup', label: 'Plugin Dup', panel: <div>plugin</div> }],
    });
    renderWithRouter(
      <SettingsPage
        me={me}
        showOrganizationTab={false}
        extraTabs={[{ value: 'dup', label: 'Prop Dup', panel: <div>prop</div> }]}
      />,
    );
    expect(screen.getByRole('tab', { name: /prop dup/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /plugin dup/i })).not.toBeInTheDocument();
  });
});
