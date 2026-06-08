import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { storeReceivedToken, tokenNeedsRefresh } from './AuthManager';
import { appState } from '../data/AppContext';
import { TokenState } from '../data/persistent/persistent.state';
import { decrementLoadingCount, incrementLoadingCount } from '../data/session/session.actions';
import { logOut } from '../data/persistent/persistent.actions';
import { clearMeState } from '../contexts/MeContext';
import { notifications } from '@mantine/notifications';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// Rate-limit (429) configuration
// ============================================================================
const RATE_LIMIT_MAX_RETRIES = 3;
const RATE_LIMIT_BASE_DELAY_MS = 1000;
let rateLimitNotificationShown = false;
let rateLimitNotificationTimeout: ReturnType<typeof setTimeout> | null = null;

// ============================================================================
// Concurrent-request limiting
// ----------------------------------------------------------------------------
// Cap the number of in-flight axios requests so a burst of context loads
// can't trip the API's rate limiter. Originated in VGR.
// ============================================================================
const MAX_CONCURRENT_REQUESTS = 3;
const REQUEST_DELAY_MS = 100; // Minimum delay between requests
let activeRequests = 0;
const requestQueue: Array<() => void> = [];
let lastRequestTime = 0;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});
const refreshApi = axios.create({ baseURL });
let refreshPromise: Promise<TokenState | null> | null = null;

// ============================================================================
// Session invalidation (VGR)
// ----------------------------------------------------------------------------
// The specific token that was invalidated due to a 401. Requests carrying this
// exact token are blocked until React re-renders and clears it from state (or
// a new token is stored). Prevents thundering-herd refresh attempts with a
// bad token while React is still tearing the tree down.
// ============================================================================
let invalidatedToken: string | null = null;

function invalidateSession(badToken: string) {
  if (invalidatedToken === badToken) return; // already handling this token
  invalidatedToken = badToken;
  if (appState) {
    appState.dispatch(logOut());
  }
  clearMeState();
}

/**
 * Attempt to refresh the token. Returns null if refresh fails.
 */
function attemptRefresh(currentToken: string): Promise<TokenState | null> {
  if (!refreshPromise) {
    refreshPromise = refreshApi
      .post('/auth/refresh', null, {
        headers: { Authorization: `Bearer ${currentToken}` },
      })
      .then(({ data }) => {
        // Reset immediately (no setTimeout race) so the next refresh can start
        // promptly if needed.
        refreshPromise = null;
        return storeReceivedToken(data.token);
      })
      .catch((error: AxiosError) => {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          invalidateSession(currentToken);
        }
        refreshPromise = null;
        return null;
      });
  }
  return refreshPromise;
}

// Proactively refresh token when tab becomes visible after being hidden (PolisOS).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && appState) {
      const tokenData = appState.state.persistent.tokenData;
      if (tokenData && tokenNeedsRefresh(tokenData)) {
        attemptRefresh(tokenData.token);
      }
    }
  });
}

// ============================================================================
// Concurrency queue helpers
// ============================================================================
/** Pop the next queued request if a slot is free. */
const processQueue = () => {
  if (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const nextRequest = requestQueue.shift();
    if (nextRequest) {
      nextRequest();
    }
  }
};

/** Wait until there's an available slot before proceeding. */
const waitForSlot = (): Promise<void> => {
  return new Promise((resolve) => {
    const tryExecute = () => {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      const delayNeeded = Math.max(0, REQUEST_DELAY_MS - timeSinceLastRequest);

      if (activeRequests < MAX_CONCURRENT_REQUESTS) {
        setTimeout(() => {
          activeRequests++;
          lastRequestTime = Date.now();
          resolve();
        }, delayNeeded);
      } else {
        requestQueue.push(tryExecute);
      }
    };
    tryExecute();
  });
};

/** Release a slot when a request completes; drain the queue. */
const releaseSlot = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  processQueue();
};

/** Debounced "Slow down" toast for 429s. */
const showRateLimitNotification = () => {
  if (rateLimitNotificationShown) return;

  rateLimitNotificationShown = true;
  notifications.show({
    id: 'rate-limit-warning',
    title: 'Slow down',
    message: 'Too many requests. Please wait a moment before trying again.',
    color: 'yellow',
    autoClose: 5000,
  });

  if (rateLimitNotificationTimeout) {
    clearTimeout(rateLimitNotificationTimeout);
  }
  rateLimitNotificationTimeout = setTimeout(() => {
    rateLimitNotificationShown = false;
  }, 10000);
};

// ============================================================================
// GET request deduplication
// ----------------------------------------------------------------------------
// Concurrent GETs to the same URL+params are coalesced into a single network
// call. Use dedupedGet() to opt in (axios passes through the same instance,
// so existing api.get callers still hit the network independently).
// ============================================================================
const inflightRequests = new Map<string, Promise<AxiosResponse>>();

function getDedupeKey(config: InternalAxiosRequestConfig): string | null {
  if (config.method?.toLowerCase() !== 'get') return null;
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${config.url}?${params}`;
}

// ============================================================================
// 429 retry with retry-after / exponential backoff
// ============================================================================
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function retryAfterDelay(error: AxiosError, retryCount: number): Promise<AxiosResponse> {
  const retryAfter = error.response?.headers?.['retry-after'];
  const delay = retryAfter
    ? parseInt(retryAfter, 10) * 1000
    : RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, retryCount);

  return sleep(delay).then(() => {
    const config = error.config!;
    (config as unknown as Record<string, unknown>)._retryCount = retryCount + 1;
    return api.request(config);
  });
}

// ============================================================================
// Interceptors
// ============================================================================
export const requestInterceptor = async (
  config: InternalAxiosRequestConfig,
): Promise<InternalAxiosRequestConfig> => {
  // Wait for a slot to prevent overwhelming the API
  await waitForSlot();

  // If a bad token was invalidated, block any request still carrying it
  // until React rehydrates state with a cleared/new token.
  if (invalidatedToken) {
    const currentToken = appState?.state?.persistent?.tokenData?.token;
    if (currentToken === invalidatedToken) {
      releaseSlot();
      if (appState) appState.dispatch(decrementLoadingCount());
      const sessionErr = new Error('Session invalidated');
      (sessionErr as Error & { isAuthError: boolean }).isAuthError = true;
      throw sessionErr;
    }
    // Token changed (cleared or replaced) — safe to proceed
    invalidatedToken = null;
  }

  try {
    // this will not be defined during tests
    if (appState) {
      appState.dispatch(incrementLoadingCount());

      let tokenData = appState.state.persistent.tokenData;

      if (tokenData) {
        if (tokenNeedsRefresh(tokenData)) {
          const refreshed = await attemptRefresh(tokenData.token);
          if (refreshed) {
            tokenData = refreshed;
          }
          // If refresh failed, still try with the old token — the
          // response interceptor will handle the 401 if it comes back.
        }

        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${tokenData.token}`;
      }
    }
    return config;
  } catch (error) {
    releaseSlot();
    if (appState) {
      appState.dispatch(decrementLoadingCount());
    }
    const authError = new Error('Authentication failed');
    (authError as Error & { isAuthError: boolean }).isAuthError = true;
    throw authError;
  }
};

export const responseInterceptor = (response: AxiosResponse): AxiosResponse => {
  releaseSlot();
  if (appState) {
    appState.dispatch(decrementLoadingCount());
  }
  // Clean up dedup cache on success
  const key = getDedupeKey(response.config as InternalAxiosRequestConfig);
  if (key) {
    inflightRequests.delete(key);
  }
  return response;
};

export const responseErrorInterceptor = (error: AxiosError): Promise<AxiosResponse | never> => {
  if (error.name === 'CanceledError') {
    releaseSlot();
    throw error;
  }

  // Clean up dedup cache on error
  if (error.config) {
    const key = getDedupeKey(error.config as InternalAxiosRequestConfig);
    if (key) {
      inflightRequests.delete(key);
    }
  }

  // On 401, attempt a token refresh and retry the request once. If the
  // refresh itself fails, invalidateSession() will be called from
  // attemptRefresh, and subsequent requests with the bad token will be
  // short-circuited in the request interceptor.
  if (error.response?.status === 401 && error.config) {
    const alreadyRetried = (error.config as unknown as Record<string, unknown>)._authRetried;
    if (!alreadyRetried) {
      const tokenData = appState?.state?.persistent?.tokenData;
      if (tokenData?.token) {
        releaseSlot();
        if (appState) appState.dispatch(decrementLoadingCount());
        return attemptRefresh(tokenData.token).then((refreshed) => {
          if (refreshed) {
            const config = error.config!;
            (config as unknown as Record<string, unknown>)._authRetried = true;
            config.headers['Authorization'] = `Bearer ${refreshed.token}`;
            return api.request(config);
          }
          // Refresh failed — invalidateSession was already called
          return Promise.reject({ status: 401, data: error.response?.data });
        });
      }
    }
    // Already retried or no token — invalidate and reject
    releaseSlot();
    if (appState) appState.dispatch(decrementLoadingCount());
    const badToken = (error.config?.headers?.['Authorization'] as string | undefined)?.replace(
      'Bearer ',
      '',
    );
    if (badToken) invalidateSession(badToken);
    return Promise.reject({ status: 401, data: error.response?.data });
  }

  // Retry on 429 with retry-after / exponential backoff
  if (error.response?.status === 429 && error.config) {
    const retryCount =
      ((error.config as unknown as Record<string, unknown>)._retryCount as number) || 0;
    if (retryCount < RATE_LIMIT_MAX_RETRIES) {
      releaseSlot();
      if (appState) appState.dispatch(decrementLoadingCount());
      return retryAfterDelay(error, retryCount);
    }
    // All retries exhausted — surface a toast and reject
    showRateLimitNotification();
    releaseSlot();
    if (appState) appState.dispatch(decrementLoadingCount());
    return Promise.reject(error.response);
  }

  releaseSlot();
  if (appState) {
    appState.dispatch(decrementLoadingCount());
  }
  return Promise.reject(error.response);
};

api.interceptors.request.use(requestInterceptor);
api.interceptors.response.use(responseInterceptor, responseErrorInterceptor);

/**
 * Wrapper that deduplicates concurrent GET requests to the same endpoint.
 * Import this instead of `api` when you want deduplication.
 */
export const dedupedGet = <T = unknown>(
  url: string,
  config?: Record<string, unknown>,
): Promise<AxiosResponse<T>> => {
  const key = `${url}?${config?.params ? JSON.stringify(config.params) : ''}`;
  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<AxiosResponse<T>>;
  }
  const request = api.get<T>(url, config);
  inflightRequests.set(key, request as Promise<AxiosResponse>);
  request.finally(() => {
    inflightRequests.delete(key);
  });
  return request;
};

export default api;
