import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { PolisProvider } from './index';
import { useColorScheme, COLOR_SCHEME_STORAGE_KEY } from '../../theme/colorScheme';
import type { PolisTheme } from '../../theme/PolisTheme';

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
    surfaceAlt: '#eeeeee',
    textPrimary: '#000000',
    textMuted: '#666666',
    border: '#cccccc',
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

// A theme with no dark set — dark mode must fall back to the light colors.
const lightOnlyTheme: PolisTheme = { ...theme, name: 'light-only', dark: undefined };

const Controls: React.FC = () => {
  const { colorScheme, resolvedColorScheme, setColorScheme, toggleColorScheme } = useColorScheme();
  return (
    <div>
      <span data-testid="pref">{colorScheme}</span>
      <span data-testid="resolved">{resolvedColorScheme}</span>
      <button data-testid="toggle" onClick={toggleColorScheme}>
        toggle
      </button>
      <button data-testid="set-dark" onClick={() => setColorScheme('dark')}>
        dark
      </button>
      <button data-testid="set-system" onClick={() => setColorScheme('system')}>
        system
      </button>
    </div>
  );
};

/** Install a controllable matchMedia. Returns a fn to flip the OS pref. */
function installMatchMedia(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return dark;
    },
    media: query,
    onchange: null,
    addListener: (l: (e: MediaQueryListEvent) => void) => listeners.add(l),
    removeListener: (l: (e: MediaQueryListEvent) => void) => listeners.delete(l),
    addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => listeners.add(l),
    removeEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => listeners.delete(l),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return (next: boolean) => {
    dark = next;
    listeners.forEach((l) => l({ matches: next } as MediaQueryListEvent));
  };
}

describe('PolisProvider color scheme', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.localStorage.clear();
    window.matchMedia = originalMatchMedia;
    const root = document.documentElement;
    Array.from(root.style)
      .filter((p) => p.startsWith('--polis-'))
      .forEach((p) => root.style.removeProperty(p));
    root.removeAttribute('data-polis-color-scheme');
    root.removeAttribute('data-mantine-color-scheme');
    root.removeAttribute('data-bs-theme');
  });

  it("resolves 'system' from matchMedia (dark)", () => {
    installMatchMedia(true);
    render(
      <PolisProvider theme={theme} defaultAppliedColorScheme="system">
        <Controls />
      </PolisProvider>,
    );
    expect(screen.getByTestId('pref')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--polis-color-surface')).toBe(
      '#101010',
    );
  });

  it("resolves 'system' from matchMedia (light)", () => {
    installMatchMedia(false);
    render(
      <PolisProvider theme={theme} defaultAppliedColorScheme="system">
        <Controls />
      </PolisProvider>,
    );
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(document.documentElement.style.getPropertyValue('--polis-color-surface')).toBe(
      '#ffffff',
    );
  });

  it('reacts to OS scheme changes when following system', () => {
    const setOsDark = installMatchMedia(false);
    render(
      <PolisProvider theme={theme} defaultAppliedColorScheme="system">
        <Controls />
      </PolisProvider>,
    );
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    act(() => setOsDark(true));
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('toggle flips the resolved scheme and the root attributes', () => {
    installMatchMedia(false);
    render(
      <PolisProvider theme={theme} defaultAppliedColorScheme="light">
        <Controls />
      </PolisProvider>,
    );
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('light');
    act(() => {
      fireEvent.click(screen.getByTestId('toggle'));
    });
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-mantine-color-scheme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('persists the preference to localStorage', () => {
    installMatchMedia(false);
    render(
      <PolisProvider theme={theme} defaultAppliedColorScheme="light">
        <Controls />
      </PolisProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByTestId('set-dark'));
    });
    expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('dark');
  });

  it('reads a persisted preference on mount', () => {
    installMatchMedia(false);
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'dark');
    render(
      <PolisProvider theme={theme} defaultAppliedColorScheme="light">
        <Controls />
      </PolisProvider>,
    );
    // Stored 'dark' wins over the 'light' default.
    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  it('falls back to light colors when the theme has no dark set', () => {
    installMatchMedia(false);
    render(
      <PolisProvider theme={lightOnlyTheme} defaultAppliedColorScheme="dark">
        <Controls />
      </PolisProvider>,
    );
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    // data attributes still say dark…
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    // …but the injected tokens are the light values (no dark set to use).
    expect(document.documentElement.style.getPropertyValue('--polis-color-surface')).toBe(
      '#ffffff',
    );
  });

  it('forceColorScheme pins the scheme and ignores storage', () => {
    installMatchMedia(false);
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'light');
    render(
      <PolisProvider theme={theme} forceColorScheme="dark">
        <Controls />
      </PolisProvider>,
    );
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    act(() => {
      fireEvent.click(screen.getByTestId('toggle'));
    });
    // Toggle is inert under forceColorScheme.
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('light');
  });
});
