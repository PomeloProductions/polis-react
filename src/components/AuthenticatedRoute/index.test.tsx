import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthenticatedRoute from './index';
import { TokenState } from '../../data/persistent/persistent.state';
import { connect } from '../../data/connect';

// Mock the connect function
jest.mock('../../data/connect', () => ({
    connect: ({ mapStateToProps, component: Component }: any) => {
        return function ConnectedComponent(props: any) {
            const state = {
                persistent: {
                    tokenData: props.tokenData
                }
            };
            const mappedProps = mapStateToProps(state);
            return <Component {...props} {...mappedProps} />;
        };
    }
}));

describe('AuthenticatedRoute', () => {
    const TestComponent = () => <div>Protected Content</div>;
    const SplashComponent = () => <div>Splash Page</div>;

    const renderWithRouter = (tokenData?: TokenState, initialRoute: string = '/protected') => {
        const ConnectedAuthRoute = connect<any, any, any>({
            mapStateToProps: (state) => ({
                tokenData: state.persistent.tokenData
            }),
            component: AuthenticatedRoute
        });

        return render(
            <MemoryRouter initialEntries={[initialRoute]}>
                <Routes>
                    <Route path="/splash" element={<SplashComponent />} />
                    <Route
                        path="/protected"
                        element={
                            <ConnectedAuthRoute tokenData={tokenData}>
                                <TestComponent />
                            </ConnectedAuthRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );
    };

    it('renders protected content when user is authenticated', async () => {
        const tokenData = { token: 'valid-token', receivedAt: Date.now() };
        renderWithRouter(tokenData, '/protected');
        await waitFor(() => {
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });
    });

    it('redirects to splash when user is not authenticated', async () => {
        renderWithRouter(undefined, '/protected');
        await waitFor(() => {
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Splash Page')).toBeInTheDocument();
        });
    });
});
