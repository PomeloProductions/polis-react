import { jest } from '@jest/globals';
import type { InternalAxiosRequestConfig } from 'axios';

// ---------------------------------------------------------------------------
// These tests exercise the REQUEST interceptor: proactive pre-request refresh
// within the 5-min margin, healthy-token pass-through, and — critically — the
// logged-out short-circuit that stops auth-required endpoints (e.g. /users/me)
// from ever hitting the network with no session. Public endpoints are still
// allowed through with no token.
// ---------------------------------------------------------------------------

type RequestInterceptor = (c: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig>;

type Mod = {
  requestInterceptor: RequestInterceptor;
  isPublicPath: (url: string | undefined) => boolean;
};

const OLD_TOKEN = 'old.jwt.token';
const NEW_TOKEN = 'new.jwt.token';

// Mutable shared state for the mocked appState + AuthManager.
let currentToken: string | null;
let needsRefresh: boolean;
const dispatch = jest.fn();

// The refresh HTTP call on the separate `refreshApi` instance. If the
// short-circuit works, an authed no-token request must NOT reach the network,
// i.e. neither this nor api.request is invoked for that request.
const refreshPost = jest.fn<() => Promise<{ data: { token: string } }>>();
const apiRequest = jest.fn();

function loadModule(): Mod {
  let mod: Mod;
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
      tokenNeedsRefresh: () => needsRefresh,
      storeReceivedToken: (token: string) => {
        currentToken = token;
        return { token, receivedAt: Date.now() };
      },
    }));

    jest.doMock('../data/session/session.actions', () => ({
      incrementLoadingCount: () => ({ type: 'inc' }),
      decrementLoadingCount: () => ({ type: 'dec' }),
    }));
    jest.doMock('../data/persistent/persistent.actions', () => ({
      logOut: () => ({ type: 'log-out' }),
    }));
    jest.doMock('../contexts/MeContext', () => ({ clearMeState: jest.fn() }));
    jest.doMock('@mantine/notifications', () => ({ notifications: { show: jest.fn() } }));

    jest.doMock('axios', () => {
      const instance = {
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
        request: apiRequest,
      };
      const refreshInstance = { post: refreshPost };
      const create = jest
        .fn()
        .mockReturnValueOnce(instance) // `api`
        .mockReturnValueOnce(refreshInstance); // `refreshApi`
      return { __esModule: true, default: { create } };
    });

    mod = require('./api') as Mod;
  });
  return mod!;
}

function makeConfig(url: string): InternalAxiosRequestConfig {
  return { url, headers: {} } as unknown as InternalAxiosRequestConfig;
}

beforeEach(() => {
  currentToken = OLD_TOKEN;
  needsRefresh = false;
  dispatch.mockClear();
  refreshPost.mockClear();
  apiRequest.mockClear();
});

describe('requestInterceptor — proactive refresh', () => {
  it('healthy token: no refresh, original token attached', async () => {
    needsRefresh = false;
    const { requestInterceptor } = loadModule();

    const out = await requestInterceptor(makeConfig('/users/me'));

    expect(refreshPost).not.toHaveBeenCalled();
    expect(out.headers.Authorization).toBe(`Bearer ${OLD_TOKEN}`);
  });

  it('near-expiry token: refreshes BEFORE the request and attaches the NEW token', async () => {
    needsRefresh = true;
    refreshPost.mockResolvedValue({ data: { token: NEW_TOKEN } });
    const { requestInterceptor } = loadModule();

    const out = await requestInterceptor(makeConfig('/users/me'));

    expect(refreshPost).toHaveBeenCalledTimes(1);
    expect(out.headers.Authorization).toBe(`Bearer ${NEW_TOKEN}`);
  });
});

describe('requestInterceptor — logged-out short-circuit', () => {
  it('no token + auth-required endpoint: does NOT hit the network and rejects with isAuthError', async () => {
    currentToken = null;
    const { requestInterceptor } = loadModule();

    await expect(requestInterceptor(makeConfig('/users/me'))).rejects.toMatchObject({
      isAuthError: true,
    });

    // The whole point: no network activity for an authed request while logged out.
    expect(refreshPost).not.toHaveBeenCalled();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('REGRESSION: /users/me while logged out makes no network call', async () => {
    currentToken = null;
    const { requestInterceptor } = loadModule();

    await expect(requestInterceptor(makeConfig('/users/me?expand[roles]=*'))).rejects.toMatchObject(
      {
        isAuthError: true,
      },
    );
    expect(refreshPost).not.toHaveBeenCalled();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('no token + PUBLIC endpoint: allowed through (no short-circuit, no auth header)', async () => {
    currentToken = null;
    const { requestInterceptor } = loadModule();

    const out = await requestInterceptor(makeConfig('/auth/login'));

    expect(out.headers.Authorization).toBeUndefined();
    expect(refreshPost).not.toHaveBeenCalled();
  });

  it('all public paths pass through with no token', async () => {
    currentToken = null;
    const publicUrls = [
      '/auth/login',
      '/auth/sign-up',
      '/auth/refresh',
      '/forgot-password',
      '/reset-password',
      '/validate-invitation',
      '/verification-codes',
      '/verification-codes-validate',
      '/general-contact',
    ];
    // A successful pass-through claims a concurrency slot that only the RESPONSE
    // interceptor releases, so reload the module per URL to reset slot state
    // (this test only cares that each public path is NOT short-circuited).
    for (const url of publicUrls) {
      const { requestInterceptor } = loadModule();
      await expect(requestInterceptor(makeConfig(url))).resolves.toBeDefined();
    }
  });
});

describe('isPublicPath', () => {
  it('matches public endpoints (with prefix / origin / query / trailing space)', () => {
    const { isPublicPath } = loadModule();
    expect(isPublicPath('/auth/login')).toBe(true);
    expect(isPublicPath('/v1/auth/login')).toBe(true);
    expect(isPublicPath('http://localhost:3000/auth/refresh')).toBe(true);
    expect(isPublicPath('/reset-password?foo=bar')).toBe(true);
    expect(isPublicPath('/general-contact ')).toBe(true);
  });

  it('does NOT match auth-required endpoints', () => {
    const { isPublicPath } = loadModule();
    expect(isPublicPath('/users/me')).toBe(false);
    expect(isPublicPath('/users/5')).toBe(false);
    expect(isPublicPath('/organizations')).toBe(false);
    expect(isPublicPath(undefined)).toBe(false);
  });
});
