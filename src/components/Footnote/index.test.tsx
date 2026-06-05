import { render } from '@testing-library/react';
import Footnote from './index';
import { renderWithRouter } from '../../test-utils';
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

test('renders Footnote without crashing', () => {
    const { baseElement } = renderWithRouter(<Footnote>A title</Footnote>);
    expect(baseElement).toBeDefined();
});

test('renders inside PolisProvider with theme A', () => {
    const theme = makeTheme('#ff00ff', 'Body-A');
    const { getByText } = render(
        <PolisProvider theme={theme}>
            <Footnote>foo</Footnote>
        </PolisProvider>
    );
    expect(getByText('foo')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--polis-font-body')).toBe('Body-A');
});

test('renders inside PolisProvider with theme B', () => {
    const theme = makeTheme('#00ffff', 'Body-B');
    const { getByText } = render(
        <PolisProvider theme={theme}>
            <Footnote>bar</Footnote>
        </PolisProvider>
    );
    expect(getByText('bar')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--polis-font-body')).toBe('Body-B');
});
