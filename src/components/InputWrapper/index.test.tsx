import { render } from '@testing-library/react';
import Input from './index';
import { PolisProvider } from '../PolisProvider';
import type { PolisTheme } from '../../theme/PolisTheme';

const themeA: PolisTheme = {
    name: 'A',
    colors: {
        primary: '#aaaaaa',
        primaryHover: '#999999',
        primaryActive: '#888888',
        surface: '#ffffff',
        surfaceAlt: '#f0f0f0',
        textPrimary: '#111111',
        textMuted: '#555555',
        border: '#cccccc',
        success: '#22aa22',
        warning: '#aaaa22',
        danger: '#aa2222',
        info: '#2222aa',
    },
    fonts: { body: 'A-body', heading: 'A-heading', mono: 'A-mono' },
    radius: { sm: '1px', md: '2px', lg: '3px', full: '99px' },
    spacing: { xs: '1px', sm: '2px', md: '3px', lg: '4px', xl: '5px' },
};

const themeB: PolisTheme = {
    ...themeA,
    name: 'B',
    colors: { ...themeA.colors, primary: '#bbbbbb', border: '#dddddd' },
    fonts: { body: 'B-body', heading: 'B-heading', mono: 'B-mono' },
};

test('renders Input without crashing', () => {
    const { baseElement } = render(<Input  label={'A Label'}/>);
    expect(baseElement).toBeDefined();
});

test('renders inside PolisProvider with theme A and applies its CSS variables', () => {
    const { getByText } = render(
        <PolisProvider theme={themeA}>
            <Input label={'Hello A'} />
        </PolisProvider>
    );
    expect(getByText('Hello A')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#aaaaaa');
    expect(document.documentElement.style.getPropertyValue('--polis-font-body')).toBe('A-body');
});

test('renders inside PolisProvider with theme B and applies its CSS variables', () => {
    const { getByText } = render(
        <PolisProvider theme={themeB}>
            <Input label={'Hello B'} />
        </PolisProvider>
    );
    expect(getByText('Hello B')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#bbbbbb');
    expect(document.documentElement.style.getPropertyValue('--polis-font-body')).toBe('B-body');
});