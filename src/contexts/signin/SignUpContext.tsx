import {
    createDefaultPhoneVerificationContextState,
    PhoneVerificationContextData,
    PhoneVerificationContextStateConsumer
} from './PhoneVerificationContext';
import React, {Dispatch, PropsWithChildren, SetStateAction, useState} from 'react';

export interface SignUpData extends PhoneVerificationContextData {
    invitation_token?: string,
    age: boolean,
    first_name: string
    last_name: string
    email: string
}

export interface SignUpContextStateConsumer extends PhoneVerificationContextStateConsumer<SignUpData> {}

let persistedState: SignUpData = {
    invitation_token: '',
    age: false,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
}

export const SignUpContext = React.createContext<SignUpContextStateConsumer>(createDefaultPhoneVerificationContextState(persistedState));

function createSetDataCallback(setData: Dispatch<SetStateAction<SignUpData>>) {
    return (newData: SignUpData) => {
        persistedState = newData;
        setData(newData);
    }
}

interface SignUpContextProviderProps {}

const SignUpContextProvider : React.FC<PropsWithChildren<SignUpContextProviderProps>> = ({children}) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, setSignUpContext] = useState(persistedState);

    const fullContext = {
        data: persistedState,
        setData: createSetDataCallback(setSignUpContext),
    } as SignUpContextStateConsumer;

    return (
        <SignUpContext.Provider value={fullContext}>
            {children}
        </SignUpContext.Provider>
    )
}

export default SignUpContextProvider;
