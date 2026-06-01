import {combineReducers} from './combineReducers';
import {sessionReducer} from './session/session.reducer';
import {persistentReducer} from './persistent/persistent.reducer';
import {initialPersistentState} from './persistent/persistent.state';
import {initialSessionState} from './session/session.state';

export const initialState: AppState = {
    session: initialSessionState,
    persistent: initialPersistentState
};

export const reducers = combineReducers({
    session: sessionReducer,
    persistent: persistentReducer
});

export type AppState = ReturnType<typeof reducers>;
