import React, {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import User, { placeholderUser } from '../models/user/user';
import AuthRequests from '../services/requests/AuthRequests';
import { clearCurrentTokenData } from '../services/AuthManager';
import { logOut } from '../data/persistent/persistent.actions';
import { connect } from '../data/connect';
import LoadingScreen from '../components/LoadingScreen';
import NetworkError from '../components/Errors/NetworkError';
import { useNavigate } from 'react-router-dom';
import { AppState } from '../data/state';

interface MeContextState {
  me: User;
  networkError: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
}

export interface MeContextStateConsumer extends MeContextState {
  setMe: (user: User) => void;
  resetNetworkError?: () => void;
}

let persistedState = {
  me: placeholderUser(),
  networkError: false,
  isLoggedIn: false,
  isLoading: true,
} as MeContextState;

let meRequest: Promise<User> | null = null;
let authFailed = false;
// The token value that triggered the auth failure. A failure only blocks the SAME token —
// a different (or new) token means a fresh sign-in, so getMe must be retried. Without this,
// a sticky authFailed left users stuck on the sign-in page after re-logging in.
let authFailedToken: string | null = null;
let retryBackoffUntil = 0;

const meSubscriptions: { [key: string]: Dispatch<SetStateAction<MeContextState>> } = {};

function createDefaultState(): MeContextStateConsumer {
  return {
    ...persistedState,

    setMe: (_user: User) => {},
  };
}

export const MeContext = React.createContext<MeContextStateConsumer>(createDefaultState());

/**
 * Immediately clears the persisted Me state and notifies all active
 * MeContextProvider instances. Called by the api service when a session is
 * invalidated (401 with no recoverable refresh) so no new instances
 * initialize with stale auth state.
 */
export function clearMeState(failedToken?: string) {
  persistedState = {
    me: placeholderUser(),
    networkError: false,
    isLoggedIn: false,
    isLoading: false,
  };
  authFailed = true;
  // Record WHICH token failed so a fresh sign-in (new token) isn't blocked by this failure.
  authFailedToken = failedToken ?? null;
  meRequest = null;
  Object.values(meSubscriptions).forEach((callback) => callback(persistedState));
}

const setPersistedState = (me: User) => {
  me.full_name = me.first_name + ' ' + me.last_name;
  persistedState = {
    me: { ...me },
    networkError: false,
    isLoggedIn: !!me.id,
    isLoading: false,
  };
  // Only clear authFailed if we actually got a valid user
  if (me.id) {
    authFailed = false;
    authFailedToken = null;
  }
  Object.values(meSubscriptions).forEach((callback) => callback(persistedState));
};

/**
 * Nothing to load (no token on an optional route): leave the loading state
 * so children render. Unlike clearMeState this does NOT mark auth as failed.
 */
const markLoadIdle = () => {
  if (!persistedState.isLoading) return;
  persistedState = {
    ...persistedState,
    isLoggedIn: false,
    isLoading: false,
  };
  Object.values(meSubscriptions).forEach((callback) => callback(persistedState));
};

const setNetworkError = () => {
  persistedState = {
    ...persistedState,
    networkError: true,
    isLoggedIn: false,
    isLoading: false,
  };
  Object.values(meSubscriptions).forEach((callback) => callback(persistedState));
};

const resetNetworkError = () => {
  persistedState = {
    ...persistedState,
    networkError: false,
    isLoading: true,
  };
  authFailed = false;
  authFailedToken = null;
  retryBackoffUntil = 0;
  meRequest = null;
  Object.values(meSubscriptions).forEach((callback) => callback(persistedState));
};

interface OwnProps {
  optional?: boolean;
  hideLoadingSpace?: boolean;
  reset?: boolean;
}

interface StateProps {
  tokenData?: { token: string; receivedAt: number };
}

type DispatchProps = {
  logOut: typeof logOut;
};

interface MeContextProviderProps extends OwnProps, StateProps {
  logOut: () => void;
}

/**
 * Allows child components the ability to easily use the information of the currently logged in user
 */
const MeContextProvider: React.FC<PropsWithChildren<MeContextProviderProps>> = ({
  hideLoadingSpace,
  logOut,
  optional,
  reset,
  tokenData,
  ...props
}) => {
  const [meContext, setMeContext] = useState(persistedState);

  const [instanceKey, _] = useState(Math.random() + '-' + Date.now());
  const navigate = useNavigate();
  // useNavigate() returns a NEW identity on every location change (react-router v6 resolves
  // relative paths against the current location). Depending on it from goToSignIn made the
  // redirect self-perpetuating: navigate('/sign-in') -> new navigate -> new goToSignIn ->
  // effect re-runs -> navigate again... an infinite update loop whenever the provider mounts
  // non-optional with no token. Route through a ref so callback identities stay stable.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const goToSignIn = useCallback(() => {
    if (!optional) {
      authFailed = true;
      // Remember which token failed so a later, different token (a fresh sign-in) isn't blocked.
      authFailedToken = tokenData?.token ?? null;
      meRequest = null;
      // Forget the previous user. Otherwise a stale me.id lingers in module state and, on the
      // next sign-in within the same session, blocks loadInfo (`if (meContext.me.id) return`)
      // so getMe never runs — leaving the app rendered but logged-out.
      persistedState = {
        ...persistedState,
        me: placeholderUser(),
        isLoading: false,
        isLoggedIn: false,
      };
      Object.values(meSubscriptions).forEach((callback) => callback(persistedState));
      try {
        clearCurrentTokenData();
        logOut();
      } catch (e) {
        // logOut may fail if store is in an unexpected state
      }
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath && currentPath !== '/sign-in') {
        localStorage.setItem('login_redirect', currentPath);
      }
      navigateRef.current('/sign-in', { replace: true });
    }
  }, [optional, logOut, tokenData]);

  const loadInfo = useCallback(async () => {
    // Skip only if a fetch is in flight or we're actually authenticated. Guarding on me.id
    // alone was wrong: a stale me.id left over from a prior session (isLoggedIn already false)
    // would block getMe forever, so re-login rendered the app in a logged-out state.
    if (meRequest || (meContext.me.id && meContext.isLoggedIn)) return;
    if (!tokenData?.token) return;

    // A previous auth failure only blocks the SAME token. A new token (fresh sign-in or
    // refresh) clears the failure so getMe is retried — otherwise login would be stuck.
    if (authFailed) {
      if (authFailedToken === tokenData.token) return;
      authFailed = false;
      authFailedToken = null;
    }

    // Respect backoff from previous 429/5xx errors
    if (Date.now() < retryBackoffUntil) return;

    try {
      meRequest = AuthRequests.getMe();
      const me = await meRequest;
      setPersistedState(me);
    } catch (error: unknown) {
      let status: number | undefined;
      // Handle multiple error shapes:
      // 1. Response interceptor rejects with { status, data } directly
      // 2. AxiosError with error.response.status (e.g. from refresh failure)
      if (typeof error === 'object' && error !== null) {
        if ('status' in error) {
          const potentialStatus = (error as { status: unknown }).status;
          if (typeof potentialStatus === 'number') {
            status = potentialStatus;
          }
        }
        if (!status && 'response' in error) {
          const response = (error as { response?: { status?: number } }).response;
          if (typeof response?.status === 'number') {
            status = response.status;
          }
        }
      }

      if (status) {
        const retryableStatuses = [429, 499, 500, 503];
        if (retryableStatuses.includes(status)) {
          // Back off before allowing another attempt
          retryBackoffUntil = Date.now() + 5000;
        } else {
          // 401, 403, etc. — auth is invalid, redirect to sign-in
          goToSignIn();
          return; // Don't clear meRequest — prevent further attempts
        }
      } else {
        setNetworkError();
      }
    }
    meRequest = null;
  }, [tokenData, meContext.me.id, meContext.isLoggedIn, goToSignIn]);

  const handleRetry = useCallback(() => {
    resetNetworkError();
    loadInfo();
  }, [loadInfo]);

  useEffect(() => {
    meSubscriptions[instanceKey] = setMeContext;

    // Allow loadInfo whenever we're not actually logged in and have a token that hasn't
    // already failed. Checking isLoggedIn (not just me.id) avoids a stale me.id from a prior
    // session blocking re-authentication. A fresh token (different from the one that failed)
    // is treated as not-yet-failed — loadInfo clears the flag itself.
    const tokenNotFailed = !authFailed || authFailedToken !== tokenData?.token;
    const isAuthenticated = meContext.me.id && meContext.isLoggedIn;
    if (!isAuthenticated && tokenData?.token && tokenNotFailed) {
      loadInfo();
    } else if (!tokenData?.token && !optional) {
      // No token at all — redirect to sign-in
      goToSignIn();
    } else if (!tokenData?.token) {
      // Optional route with no token (e.g. the sign-in page itself):
      // there is nothing to load, so the initial isLoading must clear or
      // the provider renders the "Getting Ready" screen forever.
      markLoadIdle();
    }

    return () => {
      delete meSubscriptions[instanceKey];
    };
  }, [
    tokenData,
    instanceKey,
    loadInfo,
    meContext.me.id,
    meContext.isLoggedIn,
    optional,
    goToSignIn,
  ]);

  useEffect(() => {
    if (reset) {
      loadInfo();
    }
  }, [reset, loadInfo]);

  const fullContext = {
    ...meContext,
    setMe: setPersistedState,
    resetNetworkError: handleRetry,
  } as MeContextStateConsumer;

  return (
    <MeContext.Provider value={fullContext}>
      {!meContext.isLoading ? (
        props.children
      ) : hideLoadingSpace ? (
        ''
      ) : meContext.networkError ? (
        <NetworkError onRetry={handleRetry} />
      ) : (
        <LoadingScreen text={'Getting Ready'} />
      )}
    </MeContext.Provider>
  );
};

export default connect<PropsWithChildren<OwnProps>, StateProps, DispatchProps>({
  mapStateToProps: (state: AppState) => ({
    tokenData: state.persistent.tokenData,
  }),
  mapDispatchToProps: {
    logOut,
  },
  component: MeContextProvider,
});
