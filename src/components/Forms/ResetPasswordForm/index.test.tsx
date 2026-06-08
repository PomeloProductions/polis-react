import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResetPasswordForm from './index';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const resetPasswordMock = jest.fn();
jest.mock('../../../services/requests/ResetPasswordRequests', () => ({
  __esModule: true,
  default: {
    resetPassword: (...args: unknown[]) => resetPasswordMock(...args),
  },
}));

const renderForm = (props: Record<string, unknown> = {}) =>
  render(
    <BrowserRouter>
      <ResetPasswordForm token="tok" email="a@b.com" {...props} />
    </BrowserRouter>,
  );

beforeEach(() => {
  mockNavigate.mockReset();
  resetPasswordMock.mockReset();
});

describe('ResetPasswordForm', () => {
  test('renders fields and submit button', () => {
    renderForm();
    expect(screen.getByText('New Password')).toBeInTheDocument();
    expect(screen.getByText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset Password/i })).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    const { container } = renderForm();
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    });
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  test('validates min length', async () => {
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'short' } });
    fireEvent.input(inputs[1], { target: { value: 'short' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/)).toBeInTheDocument();
    });
  });

  test('validates passwords must match', async () => {
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'password123' } });
    fireEvent.input(inputs[1], { target: { value: 'different123' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Passwords must match')).toBeInTheDocument();
    });
  });

  test('submits with token+email+password and navigates', async () => {
    resetPasswordMock.mockResolvedValueOnce({});
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'password123' } });
    fireEvent.input(inputs[1], { target: { value: 'password123' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith('tok', 'a@b.com', 'password123');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
    });
  });

  test('uses onSuccessRedirect override', async () => {
    resetPasswordMock.mockResolvedValueOnce({});
    const { container } = renderForm({ onSuccessRedirect: '/login' });
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'password123' } });
    fireEvent.input(inputs[1], { target: { value: 'password123' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('lifts 422 errors into Formik', async () => {
    resetPasswordMock.mockRejectedValueOnce({
      status: 422,
      data: { errors: { password: ['Too weak'] } },
    });
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'password123' } });
    fireEvent.input(inputs[1], { target: { value: 'password123' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Too weak')).toBeInTheDocument();
    });
  });

  test('does not crash on 429', async () => {
    resetPasswordMock.mockRejectedValueOnce({ status: 429 });
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'password123' } });
    fireEvent.input(inputs[1], { target: { value: 'password123' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalled();
    });
  });

  test('shows general error from data.message', async () => {
    resetPasswordMock.mockRejectedValueOnce({
      status: 500,
      data: { message: 'Server boom' },
    });
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'password123' } });
    fireEvent.input(inputs[1], { target: { value: 'password123' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Server boom')).toBeInTheDocument();
    });
  });

  test('falls back to default error message', async () => {
    resetPasswordMock.mockRejectedValueOnce({ status: 500 });
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'password123' } });
    fireEvent.input(inputs[1], { target: { value: 'password123' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Unable to reset password. Please try again.')).toBeInTheDocument();
    });
  });

  test('renders additionalFields', () => {
    render(
      <BrowserRouter>
        <ResetPasswordForm
          token="t"
          email="e@e.com"
          additionalFields={() => <input data-testid="extra" />}
        />
      </BrowserRouter>,
    );
    expect(screen.getByTestId('extra')).toBeInTheDocument();
  });
});
