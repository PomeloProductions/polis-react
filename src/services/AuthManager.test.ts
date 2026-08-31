import { jest } from '@jest/globals';

const dispatch = jest.fn();
jest.mock('../data/AppContext', () => ({
  appState: { dispatch, state: { persistent: {} } },
}));

import {
  tokenNeedsRefresh,
  getTokenExpiryMs,
  storeReceivedToken,
  TOKEN_REFRESH_MARGIN_MS,
  TOKEN_REFRESH_FALLBACK_MS,
} from './AuthManager';

// Build a minimal JWT (header.payload.signature) with the given `exp` (seconds).
function makeJwt(expSeconds: number | null): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = expSeconds === null ? { sub: '1' } : { sub: '1', exp: expSeconds };
  const b64 = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64(header)}.${b64(payload)}.signature`;
}

const MIN = 60 * 1000;

describe('getTokenExpiryMs', () => {
  it('decodes the exp claim (in ms) from a JWT', () => {
    const expSec = Math.floor(Date.now() / 1000) + 3600;
    expect(getTokenExpiryMs(makeJwt(expSec))).toBe(expSec * 1000);
  });

  it('returns null for a non-JWT / opaque token', () => {
    expect(getTokenExpiryMs('not-a-jwt')).toBeNull();
    expect(getTokenExpiryMs('a.b')).toBeNull();
  });

  it('returns null when exp is missing', () => {
    expect(getTokenExpiryMs(makeJwt(null))).toBeNull();
  });
});

describe('tokenNeedsRefresh (JWT exp-driven)', () => {
  it('returns false when the token is comfortably before expiry', () => {
    const expSec = Math.floor((Date.now() + 60 * MIN) / 1000); // 60 min out
    expect(tokenNeedsRefresh({ token: makeJwt(expSec), receivedAt: Date.now() })).toBe(false);
  });

  it('returns true once within the refresh margin of expiry', () => {
    // Expires in less than the margin → should refresh.
    const expMs = Date.now() + TOKEN_REFRESH_MARGIN_MS - MIN;
    const expSec = Math.floor(expMs / 1000);
    expect(tokenNeedsRefresh({ token: makeJwt(expSec), receivedAt: Date.now() })).toBe(true);
  });

  it('returns true for an already-expired token', () => {
    const expSec = Math.floor((Date.now() - 5 * MIN) / 1000);
    expect(tokenNeedsRefresh({ token: makeJwt(expSec), receivedAt: Date.now() })).toBe(true);
  });
});

describe('tokenNeedsRefresh (fallback for opaque tokens)', () => {
  it('returns false when the token is younger than the fallback window', () => {
    expect(
      tokenNeedsRefresh({
        token: 'opaque',
        receivedAt: Date.now() - (TOKEN_REFRESH_FALLBACK_MS - MIN),
      }),
    ).toBe(false);
  });

  it('returns true when the token is older than the fallback window', () => {
    expect(
      tokenNeedsRefresh({
        token: 'opaque',
        receivedAt: Date.now() - (TOKEN_REFRESH_FALLBACK_MS + MIN),
      }),
    ).toBe(true);
  });
});

describe('tokenNeedsRefresh (prefers stored expiresAt)', () => {
  it('uses expiresAt when present (false when comfortably before expiry)', () => {
    expect(
      tokenNeedsRefresh({
        token: 'opaque', // undecodable — must rely on expiresAt, not the token
        receivedAt: Date.now(),
        expiresAt: Date.now() + 60 * MIN,
      }),
    ).toBe(false);
  });

  it('uses expiresAt when present (true within the refresh margin)', () => {
    expect(
      tokenNeedsRefresh({
        token: 'opaque',
        receivedAt: Date.now(),
        expiresAt: Date.now() + TOKEN_REFRESH_MARGIN_MS - MIN,
      }),
    ).toBe(true);
  });

  it('uses expiresAt when present (true for an already-expired token)', () => {
    expect(
      tokenNeedsRefresh({
        token: 'opaque',
        receivedAt: Date.now(),
        expiresAt: Date.now() - MIN,
      }),
    ).toBe(true);
  });
});

describe('storeReceivedToken', () => {
  beforeEach(() => dispatch.mockClear());

  it('records receivedAt and expiresAt (decoded from the JWT exp)', () => {
    const expSec = Math.floor(Date.now() / 1000) + 3600;
    const before = Date.now();
    const result = storeReceivedToken(makeJwt(expSec));
    const after = Date.now();

    expect(result.token).toBe(makeJwt(expSec));
    expect(result.receivedAt).toBeGreaterThanOrEqual(before);
    expect(result.receivedAt).toBeLessThanOrEqual(after);
    expect(result.expiresAt).toBe(expSec * 1000);

    // Dispatched into persistent state with the same shape.
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'set-token-data',
        tokenData: expect.objectContaining({ expiresAt: expSec * 1000 }),
      }),
    );
  });

  it('omits expiresAt for an opaque/undecodable token', () => {
    const result = storeReceivedToken('opaque-token');
    expect(result.receivedAt).toEqual(expect.any(Number));
    expect(result.expiresAt).toBeUndefined();
  });
});
