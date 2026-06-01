import React, { PropsWithChildren } from 'react';
import { screen } from '@testing-library/react';
import Menu from './index';
import { mockUser } from '../../test-utils/mocks/models';
import { renderWithProviders, MeContextProvider as RealMeContextProvider } from '../../test-utils';

// Passthrough mock for MeContextProvider (default and named)
jest.mock('../../contexts/MeContext', () => {
    const actual = jest.requireActual('../../contexts/MeContext');
    const Passthrough: React.FC<PropsWithChildren<{}>> = ({ children }) => React.createElement(React.Fragment, null, children);
    return {
        __esModule: true,
        ...actual,
        MeContextProvider: Passthrough,
        default: Passthrough,
    };
});

// Use the real MeContextProvider for context setup in the test
const MeContextProvider = RealMeContextProvider;

describe('Menu', () => {
    it('renders basic navigation links when not logged in', () => {
        renderWithProviders(
            <MeContextProvider initialState={{
                me: {
                    user: mockUser(),
                    networkError: false,
                    isLoggedIn: false,
                    isLoading: false
                }
            }}>
                <Menu />
            </MeContextProvider>
        );

        expect(screen.getByText('Browse')).toBeInTheDocument();
        expect(screen.getByText('Sign In')).toBeInTheDocument();
        expect(screen.getByText('Sign Up')).toBeInTheDocument();
        expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('renders authenticated navigation links when logged in', () => {
        const loggedInUser = mockUser({ id: 1 });
        
        renderWithProviders(
            <MeContextProvider initialState={{
                me: {
                    user: loggedInUser,
                    networkError: false,
                    isLoggedIn: true,
                    isLoading: false
                }
            }}>
                <Menu />
            </MeContextProvider>
        );

        expect(screen.getByText('Browse')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
        expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
    });
}); 