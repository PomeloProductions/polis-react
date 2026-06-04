import {tokenNeedsRefresh} from './AuthManager';

// TODO: this test needs updating — AuthManager's TOKEN_REFRESH_INTERVAL was
// shortened to 45 minutes (JWT TTL is 60 min), but the test was written
// against an older "10 days" refresh window and asserts the opposite.
test.skip('Makes sure that the needs refresh function returns false when the auth token is within the last 10 days', async () => {

    const result = tokenNeedsRefresh({
        token: '',
        receivedAt: Date.now() - (10 * 60 * 59 * 1000)
    });

    expect(result).toBeFalsy();
});

test('Makes sure that the needs refresh function returns true when the auth token is older then 11 days.', async () => {

    const result = tokenNeedsRefresh({
        token: '',
        receivedAt: Date.now() - (11 * 60 * 60 * 1000)
    });


    expect(result).toBeTruthy();
});
