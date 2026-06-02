import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SignUpForm from './index';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
}));

jest.mock('../../../services/requests/AuthRequests', () => ({
    __esModule: true,
    default: {
        signUp: jest.fn(),
    },
}));

test('renders SignUpForm without crashing', () => {
    render(
        <BrowserRouter>
            <SignUpForm />
        </BrowserRouter>
    );

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByLabelText('I accept the terms of use')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument();
});

test('renders additionalFields when provided', () => {
    render(
        <BrowserRouter>
            <SignUpForm
                additionalInitialValues={{ first_name: '' }}
                additionalFields={(formik) => (
                    <input
                        data-testid="first-name"
                        value={formik.values.first_name as string}
                        onChange={(e) => formik.setFieldValue('first_name', e.currentTarget.value)}
                    />
                )}
            />
        </BrowserRouter>
    );

    expect(screen.getByTestId('first-name')).toBeInTheDocument();
});
