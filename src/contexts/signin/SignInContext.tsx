import {
    createDefaultPhoneVerificationContextState,
    PhoneVerificationContextData,
    PhoneVerificationContextStateConsumer
} from './PhoneVerificationContext';
import React, {Dispatch, PropsWithChildren, SetStateAction, useState} from 'react';

export interface SignInData extends PhoneVerificationContextData {
}

export interface SignInContextStateConsumer extends PhoneVerificationContextStateConsumer<SignInData> {}

let persistedState: SignInData = {
    phone: '',
    phoneInvalid: false,
}

export const SignInContext = React.createContext<SignInContextStateConsumer>(createDefaultPhoneVerificationContextState(persistedState));

function createSetDataCallback(setData: Dispatch<SetStateAction<SignInData>>) {
    return (newData: SignInData) => {
        persistedState = newData;
        setData(newData);
    }
}

interface SignInContextProviderProps {}

const SignInContextProvider : React.FC<PropsWithChildren<SignInContextProviderProps>> = ({children}) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, setSignUpContext] = useState(persistedState);

    const fullContext = {
        data: persistedState,
        setData: createSetDataCallback(setSignUpContext),
    } as SignInContextStateConsumer;

    return (
        <SignInContext.Provider value={fullContext}>
            {children}
        </SignInContext.Provider>
    )
}

export default SignInContextProvider;
