import React, {useContext, useMemo} from 'react';
import {AppContext} from './AppContext';
import {AppState} from './state';
import {AllActions} from './combineReducers';

// Type for functions in mapDispatchToProps: can return an action or a thunk
type ThunkOrActionCreator = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
) => AllActions | ((dispatch: React.Dispatch<AllActions>) => void | Promise<void>);

// Map of action creators or thunks
type ActionCreatorsMap = Record<string, ThunkOrActionCreator>;

// Type for the props injected by mapDispatchToProps (wrapped functions)
type WrappedActionCreators<T extends ActionCreatorsMap> = {
  [K in keyof T]: (...args: Parameters<T[K]>) => void;
};

interface ConnectParams<
  TOwnProps,
  TStateProps,
  TDispatchProps extends ActionCreatorsMap
> {
  mapStateToProps?: (state: AppState, props: TOwnProps) => TStateProps;
  mapDispatchToProps?: TDispatchProps;
  component: React.ComponentType<TOwnProps & TStateProps & WrappedActionCreators<TDispatchProps>>;
}

export function connect<
  TOwnProps extends {}, // Ensure TOwnProps is an object
  TStateProps = {},     // Default to empty object for no state props
  TDispatchProps extends ActionCreatorsMap = {} // Default to empty map, constrained
>(
  {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mapStateToProps = (_state?: AppState, _props?: TOwnProps) => ({} as TStateProps),
    mapDispatchToProps = {} as TDispatchProps,
    component
  }: ConnectParams<TOwnProps, TStateProps, TDispatchProps>
): React.FunctionComponent<TOwnProps> {

  const Connect: React.FC<TOwnProps> = (ownProps) => {
    const context = useContext(AppContext);

    const dispatchFuncs = useMemo(() => {
      const funcs = {} as WrappedActionCreators<TDispatchProps>;
      const keys = Object.keys(mapDispatchToProps) as (keyof TDispatchProps)[];

      for (const key of keys) {
        const originalActionCreator = mapDispatchToProps[key];

        funcs[key] = (...args: Parameters<typeof originalActionCreator>): void => {
          const resultOrThunk = originalActionCreator(...args);

          if (typeof resultOrThunk === 'function') {
            const thunk = resultOrThunk as ((dispatch: React.Dispatch<AllActions>) => void | Promise<void>);
            thunk(context.dispatch);
          } else {
            context.dispatch(resultOrThunk as AllActions);
          }
        };
      }
      return funcs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapDispatchToProps, context]);

    const stateProps = useMemo(() => {
        return mapStateToProps(context.state, ownProps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [context.state, ownProps, mapStateToProps]);

    const finalProps = useMemo(() => {
        return { ...ownProps, ...stateProps, ...dispatchFuncs };
    }, [ownProps, stateProps, dispatchFuncs]);

    return React.createElement(component, finalProps);
  };

  return React.memo(Connect);
}
