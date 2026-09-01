import { createContext, useContext, useState, useEffect, useCallback, createElement } from 'react';
import type { ReactNode } from 'react';

/**
 * The colour-scheme *preference* a user can pick. `'system'` defers to the
 * OS / browser via `prefers-color-scheme`.
 */
export type PolisColorScheme = 'light' | 'dark' | 'system';

/**
 * The concrete scheme after resolving `'system'` — always `'light'` or
 * `'dark'`. This is what drives which token set / framework attribute is
 * applied.
 */
export type ResolvedColorScheme = 'light' | 'dark';

/** localStorage key the preference is persisted under. */
export const COLOR_SCHEME_STORAGE_KEY = 'polis-color-scheme';

/** Attribute set on `<html>` for generic CSS hooks (`[data-polis-color-scheme]`). */
export const POLIS_COLOR_SCHEME_ATTR = 'data-polis-color-scheme';
/** Attribute Mantine 7/8 reads for its native colour scheme. */
export const MANTINE_COLOR_SCHEME_ATTR = 'data-mantine-color-scheme';
/** Attribute Bootstrap 5.3 reads for its native dark mode. */
export const BOOTSTRAP_COLOR_SCHEME_ATTR = 'data-bs-theme';

export interface ColorSchemeContextValue {
  /** The user's stored preference (`'light' | 'dark' | 'system'`). */
  colorScheme: PolisColorScheme;
  /** The resolved concrete scheme after applying `'system'`. */
  resolvedColorScheme: ResolvedColorScheme;
  /** Set the preference (persisted to localStorage). */
  setColorScheme: (scheme: PolisColorScheme) => void;
  /**
   * Toggle between light and dark based on the currently *resolved* scheme.
   * Toggling always lands on an explicit `'light'`/`'dark'` (never `'system'`).
   */
  toggleColorScheme: () => void;
}

export const ColorSchemeContext = createContext<ColorSchemeContextValue>({
  colorScheme: 'light',
  resolvedColorScheme: 'light',
  setColorScheme: () => {},
  toggleColorScheme: () => {},
});

/**
 * Read + control the active colour scheme.
 *
 * Returns the stored preference, the resolved concrete scheme, a setter and
 * a toggle. Safe to call outside a `<PolisProvider>` — it returns an inert
 * light-mode value.
 *
 * ```tsx
 * const { resolvedColorScheme, toggleColorScheme } = useColorScheme();
 * ```
 */
export const useColorScheme = (): ColorSchemeContextValue => useContext(ColorSchemeContext);

/** Alias for consumers that prefer the `colorMode` vocabulary. */
export const useColorMode = useColorScheme;

/** Read the OS preference. SSR-safe (returns `'light'` without a window). */
export const getSystemColorScheme = (): ResolvedColorScheme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/** Resolve a preference to a concrete scheme. */
export const resolveColorScheme = (scheme: PolisColorScheme): ResolvedColorScheme =>
  scheme === 'system' ? getSystemColorScheme() : scheme;

/** Read the persisted preference from localStorage. SSR-safe. */
export const readStoredColorScheme = (): PolisColorScheme | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const stored = window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // localStorage can throw in private mode / when disabled — ignore.
  }
  return null;
};

/** Persist the preference to localStorage. SSR-safe and error-tolerant. */
export const writeStoredColorScheme = (scheme: PolisColorScheme): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme);
  } catch {
    // ignore
  }
};

/**
 * Apply the resolved scheme to the document root by setting the generic
 * Polis hook plus the framework-native attributes. Centralised so the
 * provider and the FOUC-avoidance snippet stay in lockstep.
 */
export const applyColorSchemeToDocument = (resolved: ResolvedColorScheme): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute(POLIS_COLOR_SCHEME_ATTR, resolved);
  root.setAttribute(MANTINE_COLOR_SCHEME_ATTR, resolved);
  root.setAttribute(BOOTSTRAP_COLOR_SCHEME_ATTR, resolved);
};

/**
 * A tiny, self-contained script that resolves + applies the stored colour
 * scheme *before* React hydrates, avoiding a flash of the wrong theme
 * (FOUC). Inline it in the app's HTML `<head>` (e.g. a Vite `index.html`
 * inline `<script>` or a Next.js `beforeInteractive` script):
 *
 * ```html
 * <script>{getColorSchemeInitScript()}</script>
 * ```
 *
 * It mirrors {@link applyColorSchemeToDocument} + {@link resolveColorScheme}
 * but has zero imports so it can run standalone.
 */
export const getColorSchemeInitScript = (storageKey: string = COLOR_SCHEME_STORAGE_KEY): string => `
(function(){
  try {
    var s = localStorage.getItem(${JSON.stringify(storageKey)}) || 'system';
    var resolved = s === 'dark' || (s === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    var el = document.documentElement;
    el.setAttribute('${POLIS_COLOR_SCHEME_ATTR}', resolved);
    el.setAttribute('${MANTINE_COLOR_SCHEME_ATTR}', resolved);
    el.setAttribute('${BOOTSTRAP_COLOR_SCHEME_ATTR}', resolved);
  } catch (e) {}
})();
`;

/**
 * Standalone provider for `ColorSchemeContext`. Use this when the app has its
 * own `MantineProvider` setup (e.g. custom theme) and doesn't use `PolisProvider`.
 *
 * Reads the stored preference from localStorage on mount, listens for OS
 * `prefers-color-scheme` changes when `'system'` is active, and applies the
 * resolved scheme to the document attributes so Mantine and Bootstrap pick it up.
 */
export const ColorSchemeContextProvider = ({
  children,
  defaultColorScheme = 'system',
}: {
  children: ReactNode;
  defaultColorScheme?: PolisColorScheme;
}) => {
  const [colorScheme, setColorSchemeState] = useState<PolisColorScheme>(
    () => readStoredColorScheme() ?? defaultColorScheme,
  );
  const [resolvedColorScheme, setResolvedColorScheme] = useState<ResolvedColorScheme>(() =>
    resolveColorScheme(readStoredColorScheme() ?? defaultColorScheme),
  );

  const applyAndStore = useCallback((scheme: PolisColorScheme) => {
    const resolved = resolveColorScheme(scheme);
    writeStoredColorScheme(scheme);
    applyColorSchemeToDocument(resolved);
    setColorSchemeState(scheme);
    setResolvedColorScheme(resolved);
  }, []);

  // Apply on mount (handles the case where index.html FOUC script wasn't used).
  useEffect(() => {
    applyColorSchemeToDocument(resolvedColorScheme);
  }, []);

  // Track OS changes when scheme is 'system'.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (colorScheme === 'system') {
        const resolved = getSystemColorScheme();
        applyColorSchemeToDocument(resolved);
        setResolvedColorScheme(resolved);
      }
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [colorScheme]);

  const setColorScheme = useCallback(
    (scheme: PolisColorScheme) => applyAndStore(scheme),
    [applyAndStore],
  );

  const toggleColorScheme = useCallback(() => {
    applyAndStore(resolvedColorScheme === 'dark' ? 'light' : 'dark');
  }, [resolvedColorScheme, applyAndStore]);

  return createElement(
    ColorSchemeContext.Provider,
    { value: { colorScheme, resolvedColorScheme, setColorScheme, toggleColorScheme } },
    children,
  );
};
