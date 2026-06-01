import SessionState from './session/session.state';
import { PersistentState } from './persistent/persistent.state';
import { SessionActions } from './session/session.actions';
import { PersistentActions } from './persistent/persistent.actions';

// Describes the shape of the application state managed by these combined reducers
interface CombinedState {
    session: SessionState;
    persistent: PersistentState;
    // Add other state slices here if they exist
}

// Union of all possible action types
export type AllActions = SessionActions | PersistentActions;

// Describes the type of the 'reducers' object passed to combineReducers
// Each reducer function takes its specific slice of state and its specific actions
type ReducersMapObject = {
  session: (state: SessionState, action: SessionActions) => SessionState;
  persistent: (state: PersistentState, action: PersistentActions) => PersistentState;
};

export function combineReducers(
    reducers: ReducersMapObject
) {
    // The returned function is the main reducer for the application
    return (state: CombinedState, action: AllActions): CombinedState => {
        // Initialize newState as an empty object, to be cast to CombinedState at the end
        const newStatePartial: Partial<CombinedState> = {};

        // Handle session actions
        if (isSessionAction(action)) {
            newStatePartial.session = reducers.session(state.session, action);
            newStatePartial.persistent = state.persistent;
        }
        // Handle persistent actions
        else if (isPersistentAction(action)) {
            newStatePartial.persistent = reducers.persistent(state.persistent, action);
            newStatePartial.session = state.session;
        }

        // Cast to CombinedState, assuming all keys are handled and newStatePartial now matches CombinedState structure.
        return newStatePartial as CombinedState;
    };
}

function isSessionAction(action: AllActions): action is SessionActions {
    return (
        action.type === 'increment-loading-count' ||
        action.type === 'decrement-loading-count' ||
        action.type === 'clear-loading-count'
    );
}

function isPersistentAction(action: AllActions): action is PersistentActions {
    return (
        action.type === 'set-token-data' ||
        action.type === 'log-out'
    );
}
