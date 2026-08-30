import { TokenState } from '../data/persistent/persistent.state';
import { appState } from '../data/AppContext';
import { setTokenData } from '../data/persistent/persistent.actions';

// How long before a token's actual expiry we proactively refresh it. Refreshing
// slightly ahead of expiry means an active user's request never races the 60-min
// access-token TTL: the token is swapped out before the server would reject it.
export const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes

// Fallback window used only when a token's `exp` claim cannot be read (e.g. an
// opaque or malformed token). Access-token TTL is 60 min on the server, so a
// conservative 50-min age triggers a refresh before it would expire. This must
// stay well under the server access-token TTL, NOT the 14-day refresh_ttl — the
// old value (7 days) meant proactive refresh effectively never fired and every
// user fell through to the reactive 401 path, causing the ~60-min logout.
export const TOKEN_REFRESH_FALLBACK_MS = 50 * 60 * 1000; // 50 minutes

/**
 * Decode the `exp` (expiry) claim from a JWT, in milliseconds since epoch.
 * Returns null if the token is not a decodable JWT or has no numeric `exp`.
 * Implemented without a dependency: JWTs are three base64url segments joined
 * by dots; the middle one is the JSON payload.
 */
export function getTokenExpiryMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Restore base64 padding stripped by base64url.
    while (payload.length % 4 !== 0) payload += '=';
    const decode =
      typeof atob === 'function'
        ? atob
        : (s: string) => Buffer.from(s, 'base64').toString('binary');
    const json = JSON.parse(decode(payload)) as { exp?: number };
    if (typeof json.exp !== 'number') return null;
    return json.exp * 1000; // exp is in seconds
  } catch {
    return null;
  }
}

/**
 * Whether the token should be refreshed now. Driven by the token's real `exp`
 * claim (refresh once we're within TOKEN_REFRESH_MARGIN_MS of expiry), falling
 * back to an age-based check when `exp` is unavailable.
 */
export function tokenNeedsRefresh(tokenData: TokenState): boolean {
  const expiryMs = getTokenExpiryMs(tokenData.token);
  if (expiryMs !== null) {
    return Date.now() >= expiryMs - TOKEN_REFRESH_MARGIN_MS;
  }
  return tokenData.receivedAt + TOKEN_REFRESH_FALLBACK_MS < Date.now();
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
  appState.dispatch(setTokenData(tokenData));

  return tokenData;
}
