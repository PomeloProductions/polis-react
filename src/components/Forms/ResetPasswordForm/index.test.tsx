import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResetPasswordForm from './index';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
}));

jest.mock('../../../services/requests/ResetPasswordRequests', () => ({
    __esModule: true,
    default: {
        resetPassword: jest.fn(),
    },
}));

test('renders ResetPasswordForm without crashing', () => {
    render(
        <BrowserRouter>
            <ResetPasswordForm token="abc" email="user@example.com" />
        </BrowserRouter>
    );

    expect(screen.getByText('New Password')).toBeInTheDocument();
    expect(screen.getByText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset Password/i })).toBeInTheDocument();
});
