import {TokenState} from './persistent.state';

export const setTokenData = (tokenData: TokenState) => ({
    type: 'set-token-data' as const,
    tokenData,
});

export const logOut = () => ({
    type: 'log-out' as const,
});

export type PersistentActions =
    | ReturnType<typeof setTokenData>
    | ReturnType<typeof logOut>; 