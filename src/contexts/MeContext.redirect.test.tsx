import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppContextProvider } from '../data/AppContext';
import MeContextProvider from './MeContext';

/**
 * Regression: mounting the provider NON-optional with no token must redirect to /sign-in
 * exactly once — not loop. useNavigate() returns a new identity on every location change,
 * so a goToSignIn that depended on it re-armed its own effect after each navigate: the
 * logOut() dispatch re-rendered the tree through connect(), the fresh navigate identity
 * recreated goToSignIn, the effect re-ran, and the app spun at 100% CPU with "Maximum
 * update depth exceeded" whenever an authenticated route rendered without a token. The
 * full store + BrowserRouter wiring is required to reproduce — a bare MemoryRouter mount
 * settles after one pass.
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
