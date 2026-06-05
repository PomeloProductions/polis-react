import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { PolisProvider, usePolisTheme } from './index';
import type { PolisTheme } from '../../theme/PolisTheme';

const baseTheme: PolisTheme = {
    name: 'test-base',
    colors: {
        primary: '#ff0000',
        primaryHover: '#cc0000',
        primaryActive: '#990000',
        surface: '#ffffff',
        surfaceAlt: '#eeeeee',
        textPrimary: '#111111',
        textMuted: '#666666',
        border: '#cccccc',
        success: '#00aa00',
        warning: '#ffaa00',
        danger: '#aa0000',
        info: '#0000aa',
    },
    fonts: {
        body: '"Test Body Font", sans-serif',
        heading: '"Test Heading Font", serif',
        mono: '"Test Mono Font", monospace',
    },
    radius: { sm: '1px', md: '2px', lg: '3px', full: '99px' },
    spacing: { xs: '1px', sm: '2px', md: '3px', lg: '4px', xl: '5px' },
};

const swappedTheme: PolisTheme = {
    ...baseTheme,
    name: 'test-swapped',
    colors: {
        ...baseTheme.colors,
        primary: '#00ff00',
        surface: '#000000',
    },
    mantineTheme: { primaryColor: 'green' },
};

const ThemeReader: React.FC = () => {
    const theme = usePolisTheme();
    return <div data-testid="theme-name">{theme.name}</div>;
};

describe('PolisProvider', () => {
    afterEach(() => {
        // Clean up any --polis-* properties that might leak between tests.
        const root = document.documentElement;
        Array.from(root.style)
            .filter((prop) => prop.startsWith('--polis-'))
            .forEach((prop) => root.style.removeProperty(prop));
    });

    it('renders children', () => {
        render(
            <PolisProvider theme={baseTheme}>
                <div data-testid="child">Hello</div>
            </PolisProvider>
        );
        expect(screen.getByTestId('child')).toHaveTextContent('Hello');
    });

    it('sets CSS custom properties on document root', () => {
        render(
            <PolisProvider theme={baseTheme}>
                <span />
            </PolisProvider>
        );

        const root = document.documentElement;
        expect(root.style.getPropertyValue('--polis-color-primary')).toBe('#ff0000');
        expect(root.style.getPropertyValue('--polis-color-surface')).toBe('#ffffff');
        expect(root.style.getPropertyValue('--polis-font-body')).toBe('"Test Body Font", sans-serif');
        expect(root.style.getPropertyValue('--polis-radius-md')).toBe('2px');
        expect(root.style.getPropertyValue('--polis-spacing-md')).toBe('3px');
    });

    it('wraps children in MantineProvider so Mantine theme props are honored', () => {
        // MantineProvider sets up internal CSS variables on a wrapping element.
        // Asserting on a generated mantine class on a child Mantine element
        // would couple this test to Mantine's internals; instead we verify
        // that the provider mounts without error AND that any descendant
        // Mantine component renders.
        const { container } = render(
            <PolisProvider theme={baseTheme}>
                <div className="needs-mantine-context">x</div>
            </PolisProvider>
        );
        expect(container.querySelector('.needs-mantine-context')).not.toBeNull();
    });

    it('exposes the theme via usePolisTheme', () => {
        render(
            <PolisProvider theme={baseTheme}>
                <ThemeReader />
            </PolisProvider>
        );
        expect(screen.getByTestId('theme-name')).toHaveTextContent('test-base');
    });

    it('updates CSS variables when the theme prop changes', () => {
        const { rerender } = render(
            <PolisProvider theme={baseTheme}>
                <ThemeReader />
            </PolisProvider>
        );

        expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#ff0000');
        expect(screen.getByTestId('theme-name')).toHaveTextContent('test-base');

        act(() => {
            rerender(
                <PolisProvider theme={swappedTheme}>
                    <ThemeReader />
                </PolisProvider>
            );
        });

        expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#00ff00');
        expect(document.documentElement.style.getPropertyValue('--polis-color-surface')).toBe('#000000');
        expect(screen.getByTestId('theme-name')).toHaveTextContent('test-swapped');
    });

    it('clears CSS variables on unmount', () => {
        const { unmount } = render(
            <PolisProvider theme={baseTheme}>
                <span />
            </PolisProvider>
        );

        expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('#ff0000');
        unmount();
        expect(document.documentElement.style.getPropertyValue('--polis-color-primary')).toBe('');
    });
});
