import { screen, render } from '@testing-library/react';
import ServerAlert from './index';
import { renderWithRouter } from '../../test-utils';
import { PolisProvider } from '../PolisProvider';
import type { PolisTheme } from '../../theme/PolisTheme';

const buildRequestError = () => ({
  data: {
    errors: {
      field1: ['Error message 1'],
      field2: ['Error message 2'],
    },
  },
});

const makeTheme = (danger: string, body: string): PolisTheme => ({
  name: `t-${danger}`,
  colors: {
    primary: '#000',
    primaryHover: '#000',
    primaryActive: '#000',
    surface: '#fff',
    surfaceAlt: '#eee',
    textPrimary: '#111',
    textMuted: '#666',
    border: '#ccc',
    success: '#0a0',
    warning: '#aa0',
    danger,
    info: '#00a',
  },
  fonts: { body, heading: body, mono: body },
  radius: { sm: '1px', md: '2px', lg: '3px', full: '99px' },
  spacing: { xs: '1px', sm: '2px', md: '3px', lg: '4px', xl: '5px' },
});

test('renders ServerAlert without crashing', () => {
  renderWithRouter(<ServerAlert requestError={buildRequestError()} />);
  expect(screen.getByText('Error message 1')).toBeInTheDocument();
});

test('renders unknown error when no error messages are provided', () => {
  const emptyRequestError = {
    data: {
      errors: {},
    },
  };

  renderWithRouter(<ServerAlert requestError={emptyRequestError} />);
  expect(screen.getByText('Unknown Error')).toBeInTheDocument();
});

test('error paragraph carries the .error class so theme tokens apply', () => {
  const { getByText } = renderWithRouter(<ServerAlert requestError={buildRequestError()} />);
  const paragraph = getByText('Error message 1');
  expect(paragraph).toHaveClass('error');
});

test('renders inside PolisProvider with theme A (danger token applied)', () => {
  const theme = makeTheme('#ff00aa', 'Body-A');
  const { getByText } = render(
    <PolisProvider theme={theme}>
      <ServerAlert requestError={buildRequestError()} />
    </PolisProvider>,
  );
  expect(getByText('Error message 1')).toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue('--polis-color-danger')).toBe('#ff00aa');
});

test('renders inside PolisProvider with theme B (different danger token)', () => {
  const theme = makeTheme('#00aaff', 'Body-B');
  const { getByText } = render(
    <PolisProvider theme={theme}>
      <ServerAlert requestError={buildRequestError()} />
    </PolisProvider>,
  );
  expect(getByText('Error message 1')).toBeInTheDocument();
  expect(document.documentElement.style.getPropertyValue('--polis-color-danger')).toBe('#00aaff');
});
