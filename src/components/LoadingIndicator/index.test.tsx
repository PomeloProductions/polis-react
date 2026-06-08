import { render } from '@testing-library/react';
import LoadingIndicatorComponent from './'
import { PolisProvider } from '../PolisProvider';
import type { PolisTheme } from '../../theme/PolisTheme';

const makeTheme = (primary: string): PolisTheme => ({
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
    fonts: { body: 'B', heading: 'H', mono: 'M' },
    radius: { sm: '1px', md: '2px', lg: '3px', full: '99px' },
    spacing: { xs: '1px', sm: '2px', md: '3px', lg: '4px', xl: '5px' },
});

test('renders Header without crashing', () => {
    const { baseElement } = render(<LoadingIndicatorComponent/>);
    expect(baseElement).toBeDefined();
});

test('renders inside PolisProvider with theme A', () => {
    const theme = makeTheme('#cc00ff');
    const { baseElement } = render(
        <PolisProvider theme={theme}>
            <LoadingIndicatorComponent />
        </PolisProvider>
    );
    expect(baseElement.querySelector('.lds-ripple')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#cc00ff');
});

test('renders inside PolisProvider with theme B', () => {
    const theme = makeTheme('#00ffcc');
    const { baseElement } = render(
        <PolisProvider theme={theme}>
            <LoadingIndicatorComponent />
        </PolisProvider>
    );
    expect(baseElement.querySelector('.lds-ripple')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#00ffcc');
});
