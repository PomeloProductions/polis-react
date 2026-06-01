import React, { PropsWithChildren } from 'react';
import { MeContextStateConsumer, MeContext } from '../../../contexts/MeContext';
import { placeholderUser } from '../../../models/user/user';
import User from '../../../models/user/user';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

// Create mock store
const mockStore = configureStore([]);

// Mock MeContext value
export const mockMeContextValue = {
    me: placeholderUser(),
    networkError: false,
    isLoggedIn: false,
    isLoading: false,
    setMe: jest.fn()
};

export type MeContextProviderProps = {
    initialState?: {
        me: {
            user: User;
            networkError: boolean;
            isLoggedIn: boolean;
            isLoading: boolean;
        };
    };
    hideLoadingSpace?: boolean;
}

// MeContext Provider
export const MeContextProvider: React.FC<PropsWithChildren<MeContextProviderProps>> = ({ children, initialState, hideLoadingSpace }) => {
    const store = mockStore(initialState || {
        me: {
            user: placeholderUser(),
            networkError: false,
            isLoggedIn: false,
            isLoading: false
        }
    });

    const [meContext, setMeContext] = React.useState({
        me: initialState?.me?.user || placeholderUser(),
        networkError: initialState?.me?.networkError || false,
        isLoggedIn: initialState?.me?.isLoggedIn || false,
        isLoading: initialState?.me?.isLoading || false,
    });

    const fullContext = {
        ...meContext,
        setMe: (user: User) => {
            setMeContext(prev => ({
                ...prev,
                me: user,
                isLoggedIn: !!user.id,
                isLoading: false
            }));
            store.dispatch({ type: 'SET_USER', payload: user });
        },
    } as MeContextStateConsumer;

    return (
        <Provider store={store}>
            <MeContext.Provider value={fullContext}>
                {(!meContext.isLoading || hideLoadingSpace) ? children :
                    (meContext.networkError ?
                        <div>Network Error</div> :
                        <div>Loading...</div>
                    )
                }
            </MeContext.Provider>
        </Provider>
    );
}; 