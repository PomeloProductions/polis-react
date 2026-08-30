import {
  tokenNeedsRefresh,
  getTokenExpiryMs,
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
