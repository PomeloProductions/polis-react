import { TokenState } from '../data/persistent/persistent.state';
import { appState } from '../data/AppContext';
import { setTokenData } from '../data/persistent/persistent.actions';

// Default assumes 30-day JWTs. Consumers with shorter-lived tokens (e.g. a 60-minute
// TTL + refresh chain) should call configureTokenRefreshInterval at boot so proactive
// refresh fires before expiry instead of falling back to the 401-retry path.
let tokenRefreshInterval = 7 * 24 * 60 * 60 * 1000; // 7 days — JWT TTL is 30 days

export function configureTokenRefreshInterval(ms: number): void {
  tokenRefreshInterval = ms;
}

/**
 * Synchronously-updated module cache of the current token. `appState` only reflects a
 * dispatch after React re-renders, so interceptors that read it mid-flight can see a STALE
 * or (worse) transiently-empty token — which caused a signed-out-despite-successful-refresh
 * incident and recurring double-refresh pairs (retries re-reading an old receivedAt).
 * Interceptors must read through getCurrentTokenData(); React state remains the
 * hydration/persistence source.
 */
let currentTokenData: TokenState | null = null;

export function tokenNeedsRefresh(tokenData: TokenState): boolean {
  return tokenData.receivedAt + tokenRefreshInterval < Date.now();
}

/**
 * The freshest token available RIGHT NOW: the module cache (updated synchronously on every
 * store) falling back to redux state (covers initial hydration from localStorage).
 */
export function getCurrentTokenData(): TokenState | undefined {
  return currentTokenData ?? appState?.state?.persistent?.tokenData;
}

/** Clear the cache on logout so a dead session can't resurrect a stale token. */
export function clearCurrentTokenData(): void {
  currentTokenData = null;
}

/**
 * Puts our token into our persistent storage properly
 * @param token
 */
export function storeReceivedToken(token: string): TokenState {
  const tokenData = {
    token: token,
    receivedAt: Date.now(),
  };
  currentTokenData = tokenData; // synchronous — visible to interceptors immediately
  appState.dispatch(setTokenData(tokenData));

  return tokenData;
}
