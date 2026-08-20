import React, { PropsWithChildren } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppContextProvider } from '../data/AppContext';
import { connect } from '../data/connect';
import { AppState } from '../data/state';
import MeContextProvider from './MeContext';

/**
 * A connected passthrough between the store and the router. Every dispatch re-renders it,
 * producing FRESH child elements — defeating React's same-element bail-out. This is the
 * app-shell shape (a connected App component renders the Routes) and the ingredient that
 * turns unstable callback identities into an infinite loop.
 */
const Shell: React.FC<PropsWithChildren<{ tokenData?: unknown }>> = ({ children }) => (
  <>{children}</>
);
const ConnectedShell = connect<PropsWithChildren<{}>, { tokenData?: unknown }>({
  mapStateToProps: (state: AppState) => ({ tokenData: state.persistent.tokenData }),
  mapDispatchToProps: {},
  component: Shell,
});

/**
 * Regression: mounting the provider NON-optional with no token must redirect to /sign-in
 * exactly once — not loop. Two unstable identities fed goToSignIn: useNavigate() (new on
 * every location change) and connect()'s logOut (new on every dispatch). goToSignIn's own
 * logOut() dispatch re-rendered the tree through the connected shell, handing the provider
 * a fresh logOut, recreating goToSignIn, re-running the effect, dispatching again —
 * "Maximum update depth exceeded" at 100% CPU on any authenticated route with no token.
 */
describe('MeContextProvider sign-in redirect', () => {
  it('redirects once without an update-depth loop when mounted with no token', async () => {
    window.history.pushState({}, '', '/');

    const depthErrors: string[] = [];
    const consoleError = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      const msg = String(args[0] ?? '');
      if (msg.includes('Maximum update depth exceeded')) {
        depthErrors.push(msg);
      }
    });

    try {
      render(
        <AppContextProvider>
          <ConnectedShell>
            <BrowserRouter>
              <Routes>
                <Route path="/sign-in" element={<div>sign-in-page</div>} />
                <Route
                  path="/"
                  element={
                    <MeContextProvider>
                      <div>protected</div>
                    </MeContextProvider>
                  }
                />
              </Routes>
            </BrowserRouter>
          </ConnectedShell>
        </AppContextProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('sign-in-page')).toBeInTheDocument();
      });

      expect(depthErrors).toHaveLength(0);
    } finally {
      consoleError.mockRestore();
    }
  });
});
