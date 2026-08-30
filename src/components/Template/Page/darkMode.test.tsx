import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Page from './index';
import { PolisProvider } from '../../PolisProvider';
import { MeContextProvider } from '../../../test-utils/mocks/contexts';
import '../../../test-utils/mocks/requests';
import type { PolisTheme } from '../../../theme/PolisTheme';

// A theme whose light and dark surface/border tokens are clearly different so
// we can assert the shell follows the active colour scheme.
const theme: PolisTheme = {
  name: 'dark-capable',
  colors: {
    primary: '#111111',
    primaryHover: '#222222',
    primaryActive: '#333333',
    primaryTint: '#444444',
    primarySubtle: '#555555',
    primaryContrast: '#ffffff',
    surface: '#ffffff',
    surfaceAlt: '#f5f5f5',
    textPrimary: '#000000',
    textMuted: '#666666',
    border: '#dddddd',
    success: '#00aa00',
    warning: '#ffaa00',
    danger: '#aa0000',
    info: '#0000aa',
  },
  dark: {
    primary: '#aaaaaa',
    primaryHover: '#bbbbbb',
    primaryActive: '#cccccc',
    primaryTint: '#223344',
    primarySubtle: '#112233',
    primaryContrast: '#000000',
    surface: '#101010',
    surfaceAlt: '#1e1e1e',
    textPrimary: '#eeeeee',
    textMuted: '#999999',
    border: '#333333',
    success: '#33dd33',
    warning: '#ffdd33',
    danger: '#ff5555',
    info: '#33ddff',
  },
  fonts: { body: 'a', heading: 'b', mono: 'c' },
  radius: { sm: '1px', md: '2px', lg: '3px', full: '99px' },
  spacing: { xs: '1px', sm: '2px', md: '3px', lg: '4px', xl: '5px' },
};

const renderShell = (scheme: 'light' | 'dark') =>
  render(
    <MemoryRouter>
      <PolisProvider theme={theme} forceColorScheme={scheme}>
        <MeContextProvider>
          <Page headerTitle="My App" />
        </MeContextProvider>
      </PolisProvider>
    </MemoryRouter>,
  );

const rootVar = (name: string) => document.documentElement.style.getPropertyValue(name).trim();

// The shell surfaces are painted in index.scss from these `--polis-color-*`
// custom properties (Mantine 7's AppShell subcomponents drop inline style, so
// CSS drives the colours). These tests assert the values the SCSS consumes are
// the DARK set in dark mode and the LIGHT set in light mode. jsdom does not
// apply the compiled SCSS, so we assert on the injected tokens the rules read
// rather than on getComputedStyle.
describe('Page shell colour scheme', () => {
  afterEach(() => {
    const root = document.documentElement;
    Array.from(root.style)
      .filter((p) => p.startsWith('--polis-'))
      .forEach((p) => root.style.removeProperty(p));
  });

  it('renders the shell surfaces (header/navbar/main) and the title', () => {
    renderShell('dark');
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(document.getElementById('page-content-wrapper')).toBeInTheDocument();
    expect(screen.getByText('My App')).toBeInTheDocument();
  });

  it('injects DARK token values in dark mode (surface + surfaceAlt are dark)', () => {
    renderShell('dark');
    expect(rootVar('--polis-color-surface')).toBe('#101010');
    expect(rootVar('--polis-color-surface-alt')).toBe('#1e1e1e');
    expect(rootVar('--polis-color-text-primary')).toBe('#eeeeee');
    // A dark surface must NOT be white — this is the exact bug being fixed.
    expect(rootVar('--polis-color-surface')).not.toBe('#ffffff');
  });

  it('injects LIGHT token values in light mode (unchanged)', () => {
    renderShell('light');
    expect(rootVar('--polis-color-surface')).toBe('#ffffff');
    expect(rootVar('--polis-color-surface-alt')).toBe('#f5f5f5');
    expect(rootVar('--polis-color-text-primary')).toBe('#000000');
  });
});
