import React, {Dispatch, PropsWithChildren, SetStateAction, useCallback, useEffect, useState} from 'react';
import User, {placeholderUser} from '../models/user/user';
import AuthRequests from '../services/requests/AuthRequests';
import { logOut } from '../data/persistent/persistent.actions';
import {connect} from '../data/connect';
import LoadingScreen from '../components/LoadingScreen';
import NetworkError from '../components/Errors/NetworkError';
import {useNavigate} from "react-router-dom";
import { AppState } from '../data/state';

interface MeContextState {
    me: User,
    networkError: boolean,
    isLoggedIn: boolean,
    isLoading: boolean,
}

export interface MeContextStateConsumer extends MeContextState {
    setMe: (user: User) => void,
    resetNetworkError?: () => void,
}

let persistedState = {
    me: placeholderUser(),
    networkError: false,
    isLoggedIn: false,
    isLoading: true,
} as MeContextState;

let meRequest: Promise<User>|null = null;
let authFailed = false;
let retryBackoffUntil = 0;

const meSubscriptions: {[key: string]: Dispatch<SetStateAction<MeContextState>>} = {};

function createDefaultState(): MeContextStateConsumer {
    return {
        ...persistedState,
         
        setMe: (_user: User) => {},
    }
}

export const MeContext = React.createContext<MeContextStateConsumer>(createDefaultState());

/**
 * Immediately clears the persisted Me state and notifies all active
 * MeContextProvider instances. Called by the api service when a session is
 * invalidated (401 with no recoverable refresh) so no new instances
 * initialize with stale auth state.
 */
export function clearMeState() {
    persistedState = {
        me: placeholderUser(),
        networkError: false,
        isLoggedIn: false,
        isLoading: false,
    };
    authFailed = true;
    meRequest = null;
    Object.values(meSubscriptions).forEach(callback => callback(persistedState));
}

const setPersistedState = (me: User) => {
    me.full_name = me.first_name + ' ' + me.last_name;
    persistedState = {
        me: {...me},
        networkError: false,
        isLoggedIn: !!me.id,
        isLoading: false,
    };
    // Only clear authFailed if we actually got a valid user
    if (me.id) {
        authFailed = false;
    }
    Object.values(meSubscriptions).forEach(callback => callback(persistedState));
}

const setNetworkError = () => {
    persistedState = {
        ...persistedState,
        networkError: true,
        isLoggedIn: false,
        isLoading: false,
    }
    Object.values(meSubscriptions).forEach(callback => callback(persistedState));
}

const resetNetworkError = () => {
    persistedState = {
        ...persistedState,
        networkError: false,
        isLoading: true,
    }
    authFailed = false;
    retryBackoffUntil = 0;
    meRequest = null;
    Object.values(meSubscriptions).forEach(callback => callback(persistedState));
}

interface OwnProps {
    optional?: boolean
    hideLoadingSpace?: boolean
    reset?: boolean
}

interface StateProps {
    tokenData?: { token: string; receivedAt: number };
}

type DispatchProps = {
    logOut: typeof logOut,
}

interface MeContextProviderProps extends OwnProps, StateProps {
    logOut: () => void;
}

/**
 * Allows child components the ability to easily use the information of the currently logged in user
 */
const MeContextProvider: React.FC<PropsWithChildren<MeContextProviderProps>> = ({hideLoadingSpace, logOut, optional, reset, tokenData, ...props}) => {
    const [meContext, setMeContext] = useState(persistedState);
     
    const [instanceKey, _] = useState(Math.random() + "-" + Date.now());
    const navigate = useNavigate();

    const goToSignIn = useCallback(() => {
        if (!optional) {
            authFailed = true;
            meRequest = null;
            persistedState = {
                ...persistedState,
                isLoading: false,
                isLoggedIn: false,
            };
            Object.values(meSubscriptions).forEach(callback => callback(persistedState));
            try {
                logOut();
            } catch (e) {
                // logOut may fail if store is in an unexpected state
            }
            navigate('/sign-in', { replace: true });
        }
    }, [optional, logOut, navigate]);

    const loadInfo = useCallback(async () => {
        // Don't fire if auth already failed or a request is in flight
        if (authFailed || meRequest || meContext.me.id) return;
        if (!tokenData?.token) return;

        // Respect backoff from previous 429/5xx errors
        if (Date.now() < retryBackoffUntil) return;

        try {
            meRequest = AuthRequests.getMe();
            const me = await meRequest;
            setPersistedState(me);
        } catch(error: unknown)  {
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
    }, [tokenData, meContext.me.id, goToSignIn]);

    const handleRetry = useCallback(() => {
        resetNetworkError();
        loadInfo();
    }, [loadInfo]);

    useEffect(() => {
        meSubscriptions[instanceKey] = setMeContext;

        if (!meContext.me.id && tokenData?.token && !authFailed) {
            loadInfo();
        } else if (!tokenData?.token && !optional) {
            // No token at all — redirect to sign-in
            goToSignIn();
        }

        return () => {
            delete meSubscriptions[instanceKey];
        }
    }, [tokenData, instanceKey, loadInfo, meContext.me.id, optional, goToSignIn]);

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
            {!meContext.isLoading ? props.children :
                (hideLoadingSpace ? '' :
                    (meContext.networkError ?
                        <NetworkError onRetry={handleRetry} /> :
                        <LoadingScreen text={'Getting Ready'}/>
                    )
                )
            }
        </MeContext.Provider>
    )
};

export default connect<PropsWithChildren<OwnProps>, StateProps, DispatchProps>({
    mapStateToProps: (state: AppState) => ({
        tokenData: state.persistent.tokenData
    }),
    mapDispatchToProps: {
        logOut,
    },
    component: MeContextProvider
});
