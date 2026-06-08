import React from 'react';
import { render, act } from '@testing-library/react';
import SignUpContextProvider, { SignUpContext } from './SignUpContext';

describe('SignUpContext', () => {
  test('provides default data and setData', () => {
    let ctxSnapshot: { data: unknown; setData: (d: unknown) => void } | null = null;
    render(
      <SignUpContextProvider>
        <SignUpContext.Consumer>
          {(ctx) => {
            ctxSnapshot = ctx as never;
            return null;
          }}
        </SignUpContext.Consumer>
      </SignUpContextProvider>,
    );
    expect(ctxSnapshot!.data).toBeDefined();
    expect(typeof ctxSnapshot!.setData).toBe('function');
  });

  test('setData updates persisted state', () => {
    let ctxSnapshot: {
      data: { first_name?: string };
      setData: (d: unknown) => void;
    } | null = null;
    render(
      <SignUpContextProvider>
        <SignUpContext.Consumer>
          {(ctx) => {
            ctxSnapshot = ctx as never;
            return null;
          }}
        </SignUpContext.Consumer>
      </SignUpContextProvider>,
    );
    act(() => {
      ctxSnapshot!.setData({
        first_name: 'Ada',
        last_name: 'L',
        email: 'a@b.com',
        phone: '1',
        age: true,
      });
    });
    expect(ctxSnapshot!.data.first_name).toBe('Ada');
  });
});
