import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MenuLink from './index';
import { PolisProvider } from '../../PolisProvider';
import type { PolisTheme } from '../../../theme/PolisTheme';
import { renderWithRouter } from '../../../test-utils';

// Capture the `style` prop MenuLink hands to Mantine's <Text>. We wrap the real
// Text so rendering (and the `data-testid` href assertion) still works, while
// recording every props object it receives. This replaces an earlier
// `jest.spyOn(React, 'createElement')` approach, which no longer sees anything
// under the automatic JSX runtime that react-router v7's `Link` (and Mantine's
// polymorphic `component={Link}` path) compile to — those emit `jsx()` calls,
// not `React.createElement`.
const textPropsCapture: Array<Record<string, unknown>> = [];
jest.mock('@mantine/core', () => {
  const actual = jest.requireActual('@mantine/core');
  const RealText = actual.Text;
  return {
    ...actual,
    Text: (props: Record<string, unknown>) => {
      textPropsCapture.push(props);
      return React.createElement(RealText, props);
    },
  };
});

describe('MenuLink', () => {
  it('handles additional props correctly', () => {
    renderWithRouter(
      <MenuLink to="/test" data-testid="test-link">
        Test Link
      </MenuLink>,
      { route: '/test' },
    );

    const link = screen.getByTestId('test-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });

  // A theme whose LIGHT and DARK text tokens are clearly different so we can
  // prove the nav link colours follow the active colour scheme rather than
  // being pinned to the static (light) token set.
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

  const renderInScheme = (scheme: 'light' | 'dark', to = '/other') =>
    render(
      <MemoryRouter initialEntries={['/current']}>
        <PolisProvider theme={theme} forceColorScheme={scheme}>
          <MenuLink to={to} data-testid="nav-link">
            Reports
          </MenuLink>
        </PolisProvider>
      </MemoryRouter>,
    );

  afterEach(() => {
    const root = document.documentElement;
    Array.from(root.style)
      .filter((p) => p.startsWith('--polis-'))
      .forEach((p) => root.style.removeProperty(p));
  });

  // The nav text must be coloured from the scheme-aware `--polis-color-*`
  // custom property, NOT a hardcoded/static colour. This is the exact bug
  // being fixed: in dark mode the nav rendered light-mode grey on a dark
  // navbar (near-illegible).
  //
  // jsdom's CSSOM silently DROPS `color`/`border` declarations whose value is
  // `var(...)` (a jsdom limitation; real browsers keep them), so we cannot read
  // them back off `element.style`. Instead we capture the exact `style` object
  // MenuLink hands to <Text> (via the module mock above) and assert on the
  // string values there — which is what ships to the DOM in a real browser.
  const styleFor = (scheme: 'light' | 'dark', to = '/other'): React.CSSProperties => {
    textPropsCapture.length = 0;
    render(
      <MemoryRouter initialEntries={['/current']}>
        <PolisProvider theme={theme} forceColorScheme={scheme}>
          <MenuLink to={to} data-testid="nav-link">
            Reports
          </MenuLink>
        </PolisProvider>
      </MemoryRouter>,
    );
    // Find the <Text ...> render whose props carry our link's style (it has the
    // scheme-aware color) — it is the one with a `style.color` string.
    const props = textPropsCapture.find(
      (p) =>
        p &&
        typeof p === 'object' &&
        'style' in p &&
        (p as { style?: React.CSSProperties }).style?.color !== undefined,
    );
    if (!props) throw new Error('MenuLink did not pass a style with a color');
    return (props as { style: React.CSSProperties }).style;
  };

  it('colours inactive nav text from the scheme-aware --polis-color-text-muted var', () => {
    const style = styleFor('dark');
    expect(String(style.color)).toContain('--polis-color-text-muted');
    // Must NOT pin the raw light-mode grey directly.
    expect(String(style.color)).not.toBe('#666666');
  });

  it('colours the ACTIVE nav item from --polis-color-text-primary', () => {
    // `to` matches the current route, so the link is active.
    const style = styleFor('dark', '/current');
    expect(String(style.color)).toContain('--polis-color-text-primary');
  });

  it('uses the scheme-aware border var (not the static border colour)', () => {
    const style = styleFor('dark');
    expect(String(style.borderBottom)).toContain('--polis-color-border');
  });
});
