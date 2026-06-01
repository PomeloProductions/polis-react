import React, {PropsWithChildren, useEffect, useState, useCallback} from 'react';
import User, {placeholderUser} from '../models/user/user';
import UserRequests from '../services/requests/UserRequests';
import LoadingScreen from '../components/LoadingScreen';

let cachedUsers = [] as User[];

/**
 * The structure of the consumer
 */
export interface UserContextConsumerState {
    hasLoaded: boolean,
    notFound: boolean,
    user: User,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setUser: (_user: User) => void,
}

let defaultContext: UserContextConsumerState = {
    hasLoaded: false,
    notFound: false,
    user: placeholderUser(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setUser: (_user: User) => {}
};

export const UserContext = React.createContext<UserContextConsumerState>(defaultContext);

export interface UserContextProviderProps {
    userId: number,
    skipCache?: boolean,
}

export const UserContextProvider: React.FC<PropsWithChildren<UserContextProviderProps>> = ({userId, skipCache, children}) => {
    const [userState, setUserState] = useState(defaultContext);

    const setUser = useCallback((newUser: User): void => {
        cachedUsers[newUser.id!] = {...newUser};
        setUserState(prevState => ({
            ...prevState,
            user: newUser,
            hasLoaded: true,
            notFound: false,
        }));
    }, []);

    useEffect(() => {
        if (!skipCache && cachedUsers[userId]) {
            setUserState({
                hasLoaded: true,
                notFound: false,
                user: cachedUsers[userId],
                setUser: setUser,
            });
        } else {
            setUserState(prevState => ({
                ...prevState,
                hasLoaded: false,
                user: placeholderUser(),
                notFound: false,
                setUser: setUser,
            }));
            UserRequests.getUser(userId).then(apiUser => {
                cachedUsers[userId] = apiUser;
                setUserState(prevState => ({
                    ...prevState,
                    hasLoaded: true,
                    notFound: false,
                    user: apiUser,
                    setUser: setUser,
                }));
            }).catch(() => {
                setUserState(prevState => ({
                    ...prevState,
                    hasLoaded: true,
                    notFound: true,
                    user: placeholderUser(),
                    setUser: setUser,
                }));
            })
        }
    }, [userId, skipCache, setUser]);

    return (
        <UserContext.Provider value={{...userState, setUser}}>
            <UserContext.Consumer>
                {context => (context.hasLoaded ?
                    (!context.notFound ? children :
                        <div className={'user-not-found'}>
                            Not Found
                        </div>
                    ) : <LoadingScreen/>
                )}
            </UserContext.Consumer>
        </UserContext.Provider>
    )
}
