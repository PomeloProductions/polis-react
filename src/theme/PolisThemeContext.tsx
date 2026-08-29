import { createContext } from 'react';
import type { PolisTheme } from './PolisTheme';

/**
 * Fallback used when a component reads `usePolisTheme()` outside of a
 * `<PolisProvider>`. The values mirror the defaults in the CSS-variable
 * fallbacks (e.g. `var(--polis-color-primary, #2299dd)`).
 */
export const FALLBACK_POLIS_THEME: PolisTheme = {
  name: 'fallback',
  colors: {
    primary: '#2299dd',
    primaryHover: '#1e88c7',
    primaryActive: '#1a78b0',
    primaryTint: '#7fc4ec',
    primarySubtle: '#e6f4fb',
    primaryContrast: '#ffffff',
    surface: '#ffffff',
    surfaceAlt: '#f5f5f5',
    textPrimary: '#222428',
    textMuted: '#6c757d',
    border: '#dee2e6',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
  },
  dark: {
    primary: '#4dabf7',
    primaryHover: '#3d9be8',
    primaryActive: '#3389d4',
    primaryTint: '#1c3a52',
    primarySubtle: '#16293a',
    primaryContrast: '#0b0d10',
    surface: '#1a1b1e',
    surfaceAlt: '#25262b',
    textPrimary: '#e9ecef',
    textMuted: '#909296',
    border: '#373a40',
    success: '#51cf66',
    warning: '#ffd43b',
    danger: '#ff6b6b',
    info: '#3bc9db',
  },
  fonts: {
    body: 'system-ui, sans-serif',
    heading: 'system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  radius: {
    sm: '2px',
    md: '4px',
    lg: '8px',
    full: '9999px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
};

export const PolisThemeContext = createContext<PolisTheme>(FALLBACK_POLIS_THEME);

export default PolisThemeContext;
