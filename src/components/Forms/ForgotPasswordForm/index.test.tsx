import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ForgotPasswordForm from './index';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
}));

jest.mock('../../../services/requests/ResetPasswordRequests', () => ({
    __esModule: true,
    default: {
        forgotPassword: jest.fn(),
    },
}));

test('renders ForgotPasswordForm without crashing', () => {
    render(
        <BrowserRouter>
            <ForgotPasswordForm />
        </BrowserRouter>
    );

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send reset link/i })).toBeInTheDocument();
});
