import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.scss';
import { AppShell, Box, Burger, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Menu from '../../Menu';
import { Link } from 'react-router-dom';
import { usePolisTheme } from '../../PolisProvider';

interface PageProps extends React.HTMLProps<HTMLDivElement> {}

/**
 * Responsive application shell.
 *
 * Uses Mantine's `AppShell` so the layout adapts to the viewport with the
 * framework's own breakpoints instead of ad-hoc media queries:
 *
 *  - Desktop (≥ sm): the sidebar is docked; toggling it via the burger only
 *    hides/shows the docked column. Because `AppShell` reserves the navbar
 *    slot and animates it, the main content does not reflow ("jumping text").
 *  - Mobile (< sm): the sidebar is collapsed by default so page CONTENT is the
 *    default view. Opening the burger reveals the navbar as an OVERLAY drawer
 *    (AppShell renders a backdrop and does not push content), so there is no
 *    horizontal overflow and no layout shift.
 *
 * The header is fixed to the viewport width, keeping it aligned on mobile.
 */
const Page: React.FC<PageProps> = ({ children }) => {
  // Two independent disclosures: desktop-docked vs mobile-drawer. AppShell
  // reads `collapsed.desktop` / `collapsed.mobile` from these so the same
  // burger works at every width without reflowing content.
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const theme = usePolisTheme();

  const toggle = () => {
    toggleMobile();
    toggleDesktop();
  };

  return (
    <AppShell
      id="wrapper"
      header={{ height: 56 }}
      navbar={{
        width: 220,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
      style={{
        background: theme.colors.surface,
        color: theme.colors.textPrimary,
        fontFamily: theme.fonts.body,
      }}
    >
      <AppShell.Header
        style={{
          background: theme.colors.surfaceAlt,
          borderBottom: `1px solid ${theme.colors.border}`,
        }}
      >
        {/* Header sits inside the viewport; `Group` keeps items on one row and
            `wrap="nowrap"` + overflow guard stop horizontal overflow on phones. */}
        <Group h="100%" px="md" gap="sm" wrap="nowrap" style={{ overflow: 'hidden' }}>
          <Burger
            opened={mobileOpened}
            onClick={toggle}
            hiddenFrom="sm"
            size="sm"
            aria-label="Toggle navigation"
          />
          <Burger
            opened={desktopOpened}
            onClick={toggle}
            visibleFrom="sm"
            size="sm"
            aria-label="Toggle navigation"
          />
          <Box
            component="span"
            style={{
              fontFamily: theme.fonts.heading,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Header Title
          </Box>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        data-testid="sidebar"
        style={{
          background: theme.colors.surfaceAlt,
          borderRight: `1px solid ${theme.colors.border}`,
        }}
      >
        <Box
          style={{
            borderBottom: `1px solid ${theme.colors.border}`,
            padding: '12px 16px',
          }}
        >
          <Link
            to="/"
            onClick={closeMobile}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 500,
              fontFamily: theme.fonts.heading,
            }}
          >
            Home
          </Link>
        </Box>
        {/* Closing the mobile drawer on navigation keeps content visible after
            following a link. Wrapping in a Box with onClick is non-invasive:
            it does not alter which links Menu renders or where they point. */}
        <Box style={{ overflowY: 'auto' }} onClick={closeMobile}>
          <Menu />
        </Box>
      </AppShell.Navbar>

      <AppShell.Main id="page-content-wrapper" role="main" style={{ minWidth: 0 }}>
        <div className="container-fluid" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          {children}
        </div>
      </AppShell.Main>
    </AppShell>
  );
};

export default Page;
