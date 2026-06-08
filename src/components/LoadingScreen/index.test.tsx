import { render } from '@testing-library/react';
import LoadingScreen from './index';
import { PolisProvider } from '../PolisProvider';
import type { PolisTheme } from '../../theme/PolisTheme';

const makeTheme = (radiusMd: string, surface: string): PolisTheme => ({
  name: `t-${surface}`,
  colors: {
    primary: '#222',
    primaryHover: '#222',
    primaryActive: '#222',
    surface,
    surfaceAlt: '#eee',
    textPrimary: '#111',
    textMuted: '#666',
    border: '#ccc',
    success: '#0a0',
    warning: '#aa0',
    danger: '#a00',
    info: '#00a',
  },
  fonts: { body: 'sans-serif', heading: 'serif', mono: 'monospace' },
  radius: { sm: '1px', md: radiusMd, lg: '3px', full: '99px' },
  spacing: { xs: '1px', sm: '2px', md: '3px', lg: '4px', xl: '5px' },
});

test('renders Input without crashing', () => {
  const { baseElement } = render(<LoadingScreen text={'Loading'} />);
  expect(baseElement).toBeDefined();
});

test('LoadingScreen under theme A: applies radius A + surface A as CSS vars', () => {
  render(
    <PolisProvider theme={makeTheme('7px', '#ffeeff')}>
      <LoadingScreen text={'Loading A'} />
    </PolisProvider>,
  );
  expect(document.documentElement.style.getPropertyValue('--polis-radius-md')).toBe('7px');
  expect(document.documentElement.style.getPropertyValue('--polis-color-surface')).toBe('#ffeeff');
});

test('LoadingScreen under theme B: applies radius B + surface B as CSS vars', () => {
  render(
    <PolisProvider theme={makeTheme('13px', '#eeffee')}>
      <LoadingScreen text={'Loading B'} />
    </PolisProvider>,
  );
  expect(document.documentElement.style.getPropertyValue('--polis-radius-md')).toBe('13px');
  expect(document.documentElement.style.getPropertyValue('--polis-color-surface')).toBe('#eeffee');
});
