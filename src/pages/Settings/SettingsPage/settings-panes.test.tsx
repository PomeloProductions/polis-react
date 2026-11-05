import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../../test-utils';
import SettingsPage from './index';
import {
  registerSettingsPane,
  resetRegisteredSettingsPanes,
} from '../../../util/settings-pane-registry';
import { registerPlugin, resetPlugins } from '../../../plugins/registry';

const me = { id: 1, email: 'a@b.com', organization_managers: [] } as never;

describe('SettingsPage + registered settings panes', () => {
  beforeEach(() => {
    resetRegisteredSettingsPanes();
    resetPlugins();
  });
  afterAll(() => {
    resetRegisteredSettingsPanes();
    resetPlugins();
  });

  it('renders a package-registered settings pane', () => {
    registerSettingsPane({ value: 'theme', label: 'Theme', panel: <div>theme panel</div> });
    renderWithRouter(<SettingsPage me={me} showOrganizationTab={false} />);
    expect(screen.getByRole('tab', { name: /theme/i })).toBeInTheDocument();
  });

  it('still renders an extraTabs pane (backwards-compatible)', () => {
    renderWithRouter(
      <SettingsPage
        me={me}
        showOrganizationTab={false}
        extraTabs={[{ value: 'hltb', label: 'HLTB', panel: <div>hltb panel</div> }]}
      />,
    );
    expect(screen.getByRole('tab', { name: /hltb/i })).toBeInTheDocument();
  });

  it('renders both an extraTabs pane and a registered pane together', () => {
    registerSettingsPane({ value: 'theme', label: 'Theme', panel: <div>theme panel</div> });
    renderWithRouter(
      <SettingsPage
        me={me}
        showOrganizationTab={false}
        extraTabs={[{ value: 'hltb', label: 'HLTB', panel: <div>hltb panel</div> }]}
      />,
    );
    expect(screen.getByRole('tab', { name: /theme/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /hltb/i })).toBeInTheDocument();
  });

  it('extraTabs wins over a registered pane with the same value', () => {
    registerSettingsPane({ value: 'dup', label: 'Registered Dup', panel: <div>registered</div> });
    renderWithRouter(
      <SettingsPage
        me={me}
        showOrganizationTab={false}
        extraTabs={[{ value: 'dup', label: 'Prop Dup', panel: <div>prop</div> }]}
      />,
    );
    expect(screen.getByRole('tab', { name: /prop dup/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /registered dup/i })).not.toBeInTheDocument();
  });

  it('a plugin settings tab wins over a registered pane with the same value', () => {
    registerPlugin({
      key: 'reports',
      settingsTabs: [{ value: 'dup', label: 'Plugin Dup', panel: <div>plugin</div> }],
    });
    registerSettingsPane({ value: 'dup', label: 'Registered Dup', panel: <div>registered</div> });
    renderWithRouter(<SettingsPage me={me} showOrganizationTab={false} />);
    expect(screen.getByRole('tab', { name: /plugin dup/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /registered dup/i })).not.toBeInTheDocument();
  });

  it('honors `order` among registered panes', () => {
    registerSettingsPane({ value: 'zeta', label: 'Zeta', panel: <div>z</div>, order: 1 });
    registerSettingsPane({ value: 'alpha', label: 'Alpha', panel: <div>a</div>, order: 2 });
    renderWithRouter(<SettingsPage me={me} showOrganizationTab={false} />);
    const tabs = screen.getAllByRole('tab').map((el) => el.textContent);
    // Built-in tabs first (Account, Appearance), then extras ordered by `order`.
    const zetaIdx = tabs.findIndex((t) => /zeta/i.test(t ?? ''));
    const alphaIdx = tabs.findIndex((t) => /alpha/i.test(t ?? ''));
    expect(zetaIdx).toBeGreaterThan(-1);
    expect(alphaIdx).toBeGreaterThan(-1);
    expect(zetaIdx).toBeLessThan(alphaIdx);
  });

  it('is unchanged when the registry is empty (backwards-compatible)', () => {
    renderWithRouter(<SettingsPage me={me} showOrganizationTab={false} />);
    expect(screen.getByRole('tab', { name: /account/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /appearance/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /theme/i })).not.toBeInTheDocument();
  });
});
