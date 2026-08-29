import React from 'react';
import { useColorScheme } from '../../theme/colorScheme';

export interface ColorSchemeToggleProps {
  /** Extra class names for the button. */
  className?: string;
  /** Accessible label. Defaults to "Toggle color scheme". */
  'aria-label'?: string;
  /** Render prop for full control over the button contents. */
  children?: (args: { resolved: 'light' | 'dark' }) => React.ReactNode;
}

/**
 * Optional, dependency-free colour-scheme toggle. Additive — consumers who
 * want their own control (e.g. a Mantine `ActionIcon` with icons) can build
 * one on top of `useColorScheme()` instead.
 *
 * Renders a plain `<button>` that flips between light and dark via
 * `toggleColorScheme()`. Reflects the resolved scheme in `aria-pressed` and
 * a default sun/moon glyph.
 */
export const ColorSchemeToggle: React.FC<ColorSchemeToggleProps> = ({
  className,
  'aria-label': ariaLabel = 'Toggle color scheme',
  children,
}) => {
  const { resolvedColorScheme, toggleColorScheme } = useColorScheme();
  const isDark = resolvedColorScheme === 'dark';

  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      aria-pressed={isDark}
      data-polis-color-scheme-toggle=""
      onClick={toggleColorScheme}
    >
      {children ? children({ resolved: resolvedColorScheme }) : isDark ? '🌙' : '☀️'}
    </button>
  );
};

export default ColorSchemeToggle;
