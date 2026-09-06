import { jest } from '@jest/globals';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// ---------------------------------------------------------------------------
// These tests exercise the terminal auth-failure handling in the response
// error interceptor: an unrecoverable session (a 400 "Missing JWT Token"
// TokenMissingException, or a 401 whose refresh fails) must clear the session
// and redirect the user to the login route — loop-safe (never redirect for a
// public request or when already on a public/login route).
// ---------------------------------------------------------------------------

type Interceptors = {
  responseErrorInterceptor: (e: AxiosError) => Promise<AxiosResponse | never>;
  __setLoginNavigatorForTests: (fn: () => void) => void;
};

let currentToken: string | null;
const dispatch = jest.fn();
const clearMeState = jest.fn();
const apiRequest = jest.fn<(c: unknown) => Promise<AxiosResponse>>();
const refreshPost = jest.fn<() => Promise<{ data: { token: string } }>>();

// Captured redirect (via the injectable navigator) and the pathname the guard
// sees. jsdom's `window.location.pathname` is set through history.pushState.
let redirected: boolean;
function setPathname(path: string) {
  window.history.pushState({}, '', path);
}

function loadModule(): Interceptors {
  let mod: Interceptors;
  jest.isolateModules(() => {
    jest.doMock('../data/AppContext', () => ({
      appState: {
        get state() {
          return {
            persistent: {
              tokenData: currentToken ? { token: currentToken, receivedAt: Date.now() } : null,
            },
          };
        },
        dispatch,
      },
    }));
    jest.doMock('./AuthManager', () => ({
      tokenNeedsRefresh: () => false,
      storeReceivedToken: (token: string) => ({ token, receivedAt: Date.now() }),
    }));
    jest.doMock('../data/session/session.actions', () => ({
      incrementLoadingCount: () => ({ type: 'inc' }),
      decrementLoadingCount: () => ({ type: 'dec' }),
    }));
    jest.doMock('../data/persistent/persistent.actions', () => ({
      logOut: () => ({ type: 'log-out' }),
    }));
    jest.doMock('../contexts/MeContext', () => ({ clearMeState }));
    jest.doMock('@mantine/notifications', () => ({ notifications: { show: jest.fn() } }));
    jest.doMock('axios', () => {
      const instance = {
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
        request: apiRequest,
      };
      const refreshInstance = { post: refreshPost };
      const create = jest.fn().mockReturnValueOnce(instance).mockReturnValueOnce(refreshInstance);
      return { __esModule: true, default: { create } };
    });
    mod = require('./api') as Interceptors;
  });
  // Route the redirect through the injectable navigator instead of jsdom's
  // non-reconfigurable window.location.assign.
  mod!.__setLoginNavigatorForTests(() => {
    redirected = true;
  });
  return mod!;
}

function makeTokenMissing400(url?: string, token?: string): AxiosError {
  return {
    name: 'AxiosError',
    isAxiosError: true,
    message: 'Request failed with status code 400',
    config: {
      url,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    } as unknown as InternalAxiosRequestConfig,
    response: {
      status: 400,
      data: {
        message: 'Missing JWT Token',
        exception_class: 'Polis\\Exceptions\\JWT\\TokenMissingException',
      },
    } as AxiosResponse,
  } as AxiosError;
}

beforeEach(() => {
  currentToken = 'some.jwt.token';
  redirected = false;
  dispatch.mockClear();
  clearMeState.mockClear();
  apiRequest.mockClear();
  refreshPost.mockClear();
  setPathname('/my-games');
});

it('400 Missing JWT (TokenMissingException) from an authed route -> clears session + redirects to /sign-in', async () => {
  const { responseErrorInterceptor } = loadModule();
  await expect(
    responseErrorInterceptor(makeTokenMissing400('/users/1/tabs', 'some.jwt.token')),
  ).rejects.toBeDefined();
  // Session cleared (logOut dispatched) and redirected to login.
  expect(dispatch).toHaveBeenCalledWith({ type: 'log-out' });
  expect(redirected).toBe(true);
});

it('400 Missing JWT on a PUBLIC request (login) -> does NOT redirect', async () => {
  const { responseErrorInterceptor } = loadModule();
  await expect(responseErrorInterceptor(makeTokenMissing400('/auth/login'))).rejects.toBeDefined();
  expect(redirected).toBe(false);
});

it('400 Missing JWT while already on /sign-in -> clears session but does NOT redirect (loop guard)', async () => {
  setPathname('/sign-in');
  const { responseErrorInterceptor } = loadModule();
  await expect(
    responseErrorInterceptor(makeTokenMissing400('/users/1/tabs', 'some.jwt.token')),
  ).rejects.toBeDefined();
  expect(redirected).toBe(false);
});

it('400 detected by message when exception_class is absent', async () => {
  const { responseErrorInterceptor } = loadModule();
  const err = makeTokenMissing400('/users/1/tabs', 'some.jwt.token');
  (err.response as AxiosResponse).data = { message: 'Missing JWT Token' };
  await expect(responseErrorInterceptor(err)).rejects.toBeDefined();
  expect(redirected).toBe(true);
});

it('a plain 400 that is NOT a token error is left alone (no redirect)', async () => {
  const { responseErrorInterceptor } = loadModule();
  const err = makeTokenMissing400('/users/1/tabs', 'some.jwt.token');
  (err.response as AxiosResponse).data = { message: 'Validation failed' };
  await expect(responseErrorInterceptor(err)).rejects.toBeDefined();
  expect(redirected).toBe(false);
});

it('401 whose refresh fails -> clears session + redirects to /sign-in', async () => {
  refreshPost.mockRejectedValueOnce({ response: { status: 401 } });
  const { responseErrorInterceptor } = loadModule();
  const err = {
    name: 'AxiosError',
    isAxiosError: true,
    message: 'Request failed with status code 401',
    config: { url: '/users/1/tabs', headers: { Authorization: 'Bearer some.jwt.token' } },
    response: { status: 401, data: { error: 'expired' } },
  } as unknown as AxiosError;
  await expect(responseErrorInterceptor(err)).rejects.toMatchObject({ status: 401 });
  expect(redirected).toBe(true);
});
