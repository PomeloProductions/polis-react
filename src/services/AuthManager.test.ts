import { tokenNeedsRefresh } from './AuthManager';

// AuthManager's TOKEN_REFRESH_INTERVAL is 7 days (JWT TTL is 30 days). A token
// is considered stale once it is older than that window.
const DAY = 24 * 60 * 60 * 1000;

test('returns false when the auth token is within the 7-day refresh window', async () => {
  const result = tokenNeedsRefresh({
    token: '',
    receivedAt: Date.now() - 6 * DAY,
  });

  expect(result).toBeFalsy();
});

test('returns true when the auth token is older than the 7-day refresh window', async () => {
  const result = tokenNeedsRefresh({
    token: '',
    receivedAt: Date.now() - 8 * DAY,
  });

  expect(result).toBeTruthy();
});
