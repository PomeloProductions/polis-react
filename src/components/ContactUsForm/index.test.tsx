import { render } from '@testing-library/react';
import { renderWithRouter } from '../../test-utils';
import { MemoryRouter } from 'react-router-dom';
import ContactUsForm from './index';
import { PolisProvider } from '../PolisProvider';
import type { PolisTheme } from '../../theme/PolisTheme';

const makeTheme = (primary: string, body: string): PolisTheme => ({
  name: `t-${primary}`,
  colors: {
    primary,
    primaryHover: primary,
    primaryActive: primary,
    surface: '#fff',
    surfaceAlt: '#eee',
    textPrimary: '#111',
    textMuted: '#666',
    border: '#ccc',
    success: '#0a0',
    warning: '#aa0',
    danger: '#a00',
    info: '#00a',
  },
  fonts: { body, heading: body, mono: body },
  radius: { sm: '1px', md: '2px', lg: '3px', full: '99px' },
  spacing: { xs: '1px', sm: '2px', md: '3px', lg: '4px', xl: '5px' },
});

test('renders ContactUsForm without crashing', () => {
  const { container } = renderWithRouter(<ContactUsForm />);
  expect(container).toBeTruthy();
});

test('submit button is themed via .contact-us-form__submit class', () => {
  const { container } = renderWithRouter(<ContactUsForm />);
  const submit = container.querySelector('.contact-us-form__submit');
  expect(submit).toBeInTheDocument();
  expect(submit?.textContent).toContain('Submit');
});

test('renders inside PolisProvider with theme A (primary token applied)', () => {
  const theme = makeTheme('#ff7700', 'Body-A');
  const { container } = render(
    <MemoryRouter>
      <PolisProvider theme={theme}>
        <ContactUsForm />
      </PolisProvider>
    </MemoryRouter>,
  );
  expect(container.querySelector('.contact-us-form')).toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#ff7700');
  expect(document.documentElement.style.getPropertyValue('--polis-font-body')).toBe('Body-A');
});

test('renders inside PolisProvider with theme B (primary token swapped)', () => {
  const theme = makeTheme('#00ff77', 'Body-B');
  const { container } = render(
    <MemoryRouter>
      <PolisProvider theme={theme}>
        <ContactUsForm />
      </PolisProvider>
    </MemoryRouter>,
  );
  expect(container.querySelector('.contact-us-form')).toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#00ff77');
  expect(document.documentElement.style.getPropertyValue('--polis-font-body')).toBe('Body-B');
});
