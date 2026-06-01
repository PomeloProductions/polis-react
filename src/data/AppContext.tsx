import React, {createContext, PropsWithChildren, useEffect, useReducer} from 'react';
import {initialState, AppState, reducers} from './state'
import { AllActions } from './combineReducers';

let appState: AppContextState;

export interface AppContextState {
    state: AppState;
    dispatch: React.Dispatch<AllActions>;
}

export const AppContext = createContext<AppContextState>({
    state: initialState,
    dispatch: () => undefined
});

export const AppContextProvider: React.FC<PropsWithChildren> = (props => {
    const fullInitialState = {
        session: initialState.session,
        persistent: {
            ...initialState.persistent,
            ...JSON.parse(window.localStorage['persistedState'] ?? '{}')
        }
    }

    const [state, dispatch] = useReducer(reducers, fullInitialState);

    appState = {
        state: state,
        dispatch
    };

    useEffect(() => {
        window.localStorage['persistedState'] = JSON.stringify(state.persistent);
    }, [state]);
    return (
        <AppContext.Provider value={appState}>
            {props.children}
        </AppContext.Provider>
    )
});

export {appState};
