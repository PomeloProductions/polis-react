import React, { createContext, PropsWithChildren, useEffect, useReducer } from 'react';
import { initialState, AppState, reducers } from './state';
import { AllActions } from './combineReducers';

export interface AppContextState {
  state: AppState;
  dispatch: React.Dispatch<AllActions>;
}

// The current app store (state + dispatch) kept outside React so non-component
// code (the api service, AuthManager.storeReceivedToken, etc.) can dispatch.
//
// IMPORTANT: this is stashed on `globalThis` rather than a plain module-level
// `let`. In dev, Vite can serve this module under two identities at once — the
// aliased source copy AND an optimizer-processed copy with a `?v=` query — and
// a plain module binding is NOT shared between those two instances. The provider
// renders in one copy and assigns `appState`; consumers like AuthManager resolve
// the OTHER copy, where the binding is still `undefined`, so `appState.dispatch`
// throws and (e.g.) a freshly-received login token is never stored. Routing the
// value through a single globalThis slot makes every copy read/write the same
// store, which is the correct singleton semantics in all cases.
const APP_STATE_KEY = '__POLIS_APP_STATE__';

type GlobalWithAppState = typeof globalThis & {
  [APP_STATE_KEY]?: AppContextState;
};

/** Returns the current app store, or undefined before the provider has mounted. */
export function getAppState(): AppContextState | undefined {
  return (globalThis as GlobalWithAppState)[APP_STATE_KEY];
}

function setAppStateSingleton(value: AppContextState): void {
  (globalThis as GlobalWithAppState)[APP_STATE_KEY] = value;
}

export const AppContext = createContext<AppContextState>({
  state: initialState,
  dispatch: () => undefined,
});

export const AppContextProvider: React.FC<PropsWithChildren> = (props) => {
  const fullInitialState = {
    session: initialState.session,
    persistent: {
      ...initialState.persistent,
      ...JSON.parse(window.localStorage['persistedState'] ?? '{}'),
    },
  };

  const [state, dispatch] = useReducer(reducers, fullInitialState);

  const appState: AppContextState = {
    state: state,
    dispatch,
  };
  setAppStateSingleton(appState);

  useEffect(() => {
    window.localStorage['persistedState'] = JSON.stringify(state.persistent);
  }, [state]);
  return <AppContext.Provider value={appState}>{props.children}</AppContext.Provider>;
};
