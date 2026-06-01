import {tokenNeedsRefresh} from './AuthManager';

test('Makes sure that the needs refresh function returns false when the auth token is within the last 10 days', async () => {

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
