import React from 'react';
import { render, act } from '@testing-library/react';
import SignInContextProvider, { SignInContext } from './SignInContext';
import { createDefaultPhoneVerificationContextState } from './PhoneVerificationContext';

describe('SignInContext', () => {
    test('provides default data and setData function', () => {
        let ctxSnapshot: { data: { phone: string }; setData: (d: unknown) => void } | null =
            null;
        render(
            <SignInContextProvider>
                <SignInContext.Consumer>
                    {(ctx) => {
                        ctxSnapshot = ctx as never;
                        return null;
                    }}
                </SignInContext.Consumer>
            </SignInContextProvider>
        );
        expect(ctxSnapshot!.data).toBeDefined();
        expect(typeof ctxSnapshot!.setData).toBe('function');
    });

    test('setData updates persisted state', () => {
        let ctxSnapshot: { data: { phone?: string }; setData: (d: unknown) => void } | null =
            null;
        render(
            <SignInContextProvider>
                <SignInContext.Consumer>
                    {(ctx) => {
                        ctxSnapshot = ctx as never;
                        return null;
                    }}
                </SignInContext.Consumer>
            </SignInContextProvider>
        );
        act(() => {
            ctxSnapshot!.setData({ phone: '555' });
        });
        expect(ctxSnapshot!.data.phone).toBe('555');
    });

    test('createDefaultPhoneVerificationContextState returns persistedState + setData', () => {
        const state = createDefaultPhoneVerificationContextState({ phone: '111' });
        expect(state.data).toEqual({ phone: '111' });
        expect(typeof state.setData).toBe('function');
    });
});
