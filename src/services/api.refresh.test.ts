import { jest } from '@jest/globals';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// ---------------------------------------------------------------------------
// These tests exercise the 401 -> refresh -> retry flow in the response error
// interceptor, plus the single-flight refresh guard, without a real network.
// ---------------------------------------------------------------------------

type Interceptors = {
  responseErrorInterceptor: (e: AxiosError) => Promise<AxiosResponse | never>;
};

const NEW_TOKEN = 'new.jwt.token';
const OLD_TOKEN = 'old.jwt.token';

// Mutable state shared with the mocked appState.
let currentToken: string | null;
const dispatch = jest.fn();

// The mocked `api.request` used by the retry path, and the refresh HTTP call.
const apiRequest = jest.fn<(c: unknown) => Promise<AxiosResponse>>();
const refreshPost = jest.fn<() => Promise<{ data: { token: string } }>>();

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

    mod = require('./api') as Interceptors;
  });
  return mod!;
}

function make401(token: string): AxiosError {
  return {
    name: 'AxiosError',
    isAxiosError: true,
    message: 'Request failed with status code 401',
    config: {
      headers: { Authorization: `Bearer ${token}` },
    } as unknown as InternalAxiosRequestConfig,
    response: { status: 401, data: { error: 'expired' } } as AxiosResponse,
  } as AxiosError;
}

beforeEach(() => {
  currentToken = OLD_TOKEN;
  dispatch.mockClear();
  apiRequest.mockClear();
  refreshPost.mockClear();
});

it('401 -> refresh succeeds -> retries original request with new token', async () => {
  refreshPost.mockResolvedValue({ data: { token: NEW_TOKEN } });
  apiRequest.mockResolvedValue({ status: 200, data: { ok: true } } as AxiosResponse);

  const { responseErrorInterceptor } = loadModule();
  const result = await responseErrorInterceptor(make401(OLD_TOKEN));

  expect(refreshPost).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledTimes(1);
  const retriedConfig = apiRequest.mock.calls[0][0] as {
    headers: Record<string, string>;
    _authRetried: boolean;
  };
  expect(retriedConfig.headers.Authorization).toBe(`Bearer ${NEW_TOKEN}`);
  expect(retriedConfig._authRetried).toBe(true);
  expect((result as AxiosResponse).status).toBe(200);
});

it('401 -> refresh returns 401 (refresh_ttl exceeded) -> logs out, no retry', async () => {
  const refreshErr = { response: { status: 401 } } as AxiosError;
  refreshPost.mockRejectedValue(refreshErr);

  const { responseErrorInterceptor } = loadModule();
  await expect(responseErrorInterceptor(make401(OLD_TOKEN))).rejects.toMatchObject({ status: 401 });

  expect(refreshPost).toHaveBeenCalledTimes(1);
  expect(apiRequest).not.toHaveBeenCalled();
  // logOut dispatched
  expect(dispatch).toHaveBeenCalledWith({ type: 'log-out' });
});

it('concurrent 401s share a single refresh call (single-flight)', async () => {
  let resolveRefresh: (v: { data: { token: string } }) => void = () => {};
  refreshPost.mockReturnValue(
    new Promise((res) => {
      resolveRefresh = res;
    }),
  );
  apiRequest.mockResolvedValue({ status: 200, data: {} } as AxiosResponse);

  const { responseErrorInterceptor } = loadModule();

  const p1 = responseErrorInterceptor(make401(OLD_TOKEN));
  const p2 = responseErrorInterceptor(make401(OLD_TOKEN));

  resolveRefresh({ data: { token: NEW_TOKEN } });
  await Promise.all([p1, p2]);

  // Only one /auth/refresh despite two concurrent 401s.
  expect(refreshPost).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledTimes(2);
});

it('a request whose token was already refreshed by a sibling retries without re-refreshing', async () => {
  // State already holds the new token; the failing request carried the old one.
  currentToken = NEW_TOKEN;
  apiRequest.mockResolvedValue({ status: 200, data: {} } as AxiosResponse);

  const { responseErrorInterceptor } = loadModule();
  await responseErrorInterceptor(make401(OLD_TOKEN));

  // No refresh — just a retry with the already-current token.
  expect(refreshPost).not.toHaveBeenCalled();
  expect(apiRequest).toHaveBeenCalledTimes(1);
  const retried = apiRequest.mock.calls[0][0] as { headers: Record<string, string> };
  expect(retried.headers.Authorization).toBe(`Bearer ${NEW_TOKEN}`);
});
