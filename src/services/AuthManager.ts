import { TokenState } from '../data/persistent/persistent.state';
import { appState } from '../data/AppContext';
import { setTokenData } from '../data/persistent/persistent.actions';

const TOKEN_REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days — JWT TTL is 30 days

export function tokenNeedsRefresh(tokenData: TokenState): boolean {
  return tokenData.receivedAt + TOKEN_REFRESH_INTERVAL < Date.now();
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
