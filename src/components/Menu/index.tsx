import React from 'react';
import { Stack } from '@mantine/core';
import { useLocation } from 'react-router-dom';
import MeContextProvider, { MeContext } from '../../contexts/MeContext';
import MenuLink from './MenuLink';

/**
 * App-specific sidebar menu. Polis-family apps call setAppMenu at startup to
 * replace the default menu with their own navigation.
 */
let AppMenu: React.FC | null = null;

export function setAppMenu(component: React.FC): void {
  AppMenu = component;
}

const Menu: React.FC = () => {
  const location = useLocation();
  const inTodos = location.pathname.startsWith('/todos');

  if (AppMenu) {
    return <AppMenu />;
  }

  return (
    <Stack gap={0}>
      <MeContextProvider optional hideLoadingSpace>
        <MeContext.Consumer>
          {(context) =>
            context.isLoggedIn ? (
              <>
                <MenuLink to="/todos/today">Todos</MenuLink>
                {inTodos && (
                  <Stack gap={0} pl="md">
                    <MenuLink to="/todos/today">Today</MenuLink>
                    <MenuLink to="/todos/time-tracking">Time Tracking</MenuLink>
                    <MenuLink to="/todos/reports">Reports</MenuLink>
                    <MenuLink to="/todos/calendars">Calendars</MenuLink>
                  </Stack>
                )}
                <MenuLink to="/settings">Settings</MenuLink>
              </>
            ) : (
              <>
                <MenuLink to="/sign-in">Sign In</MenuLink>
                <MenuLink to="/sign-up">Sign Up</MenuLink>
              </>
            )
          }
        </MeContext.Consumer>
      </MeContextProvider>
    </Stack>
  );
};

export default Menu;
