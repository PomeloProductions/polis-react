import React from 'react';
import { Text } from '@mantine/core';
import { Link, LinkProps, useLocation } from 'react-router-dom';
import { usePolisTheme } from '../../PolisProvider';

const MenuLink: React.FC<LinkProps> = ({ children, to, ...props }) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  const theme = usePolisTheme();

  return (
    <Text
      component={Link}
      to={to}
      size="sm"
      fw={isActive ? 500 : 400}
      py="sm"
      px="md"
      display="block"
      // Colour the link from the scheme-aware `--polis-color-*` custom
      // properties (swapped per colour scheme by <PolisProvider>), NOT the
      // static `theme.colors.*` — those always hold the LIGHT token set, so in
      // dark mode the nav text rendered as light-mode grey on a dark navbar
      // (near-illegible). The `theme.colors.*` values are only used as the
      // CSS-var fallbacks for when no <PolisProvider> is mounted.
      //
      // The colour is set via inline `style` (not Mantine's `c` prop): `c`
      // only accepts theme colour keys / resolvable colours and silently drops
      // a raw `var(--polis-…)` string, so the token would never reach the DOM.
      style={{
        color: isActive
          ? `var(--polis-color-text-primary, ${theme.colors.textPrimary})`
          : `var(--polis-color-text-muted, ${theme.colors.textMuted})`,
        textDecoration: 'none',
        borderBottom: `1px solid var(--polis-color-border, ${theme.colors.border})`,
        fontFamily: `var(--polis-font-body, ${theme.fonts.body})`,
      }}
      {...props}
    >
      {children}
    </Text>
  );
};

export default MenuLink;
