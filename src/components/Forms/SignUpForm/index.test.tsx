import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SignUpForm from './index';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const signUpMock = jest.fn();
jest.mock('../../../services/requests/AuthRequests', () => ({
  __esModule: true,
  default: {
    signUp: (...args: unknown[]) => signUpMock(...args),
  },
}));

const renderForm = (props: Record<string, unknown> = {}) =>
  render(
    <BrowserRouter>
      <SignUpForm {...props} />
    </BrowserRouter>,
  );

const fillBaseFields = (container: HTMLElement) => {
  const inputs = container.querySelectorAll('input');
  // email, password, password_confirmation, accept_terms checkbox
  fireEvent.input(inputs[0], { target: { value: 'a@b.com' } });
  fireEvent.input(inputs[1], { target: { value: 'password123' } });
  fireEvent.input(inputs[2], { target: { value: 'password123' } });
  const checkbox = container.querySelector('input[type=checkbox]') as HTMLInputElement;
  fireEvent.click(checkbox);
};

beforeEach(() => {
  mockNavigate.mockReset();
  signUpMock.mockReset();
});

describe('SignUpForm', () => {
  test('renders base fields and Sign Up button', () => {
    renderForm();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByLabelText('I accept the terms of use')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument();
  });

  test('validates required fields on submit', async () => {
    const { container } = renderForm();
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText(/Email is required/)).toBeInTheDocument();
      expect(screen.getByText(/Password is required/)).toBeInTheDocument();
      expect(screen.getByText(/Please confirm your password/)).toBeInTheDocument();
      expect(screen.getByText(/You must accept the terms/)).toBeInTheDocument();
    });
    expect(signUpMock).not.toHaveBeenCalled();
  });

  test('validates email format', async () => {
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'not-an-email' } });
    fireEvent.input(inputs[1], { target: { value: 'password123' } });
    fireEvent.input(inputs[2], { target: { value: 'password123' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Must be a valid email')).toBeInTheDocument();
    });
  });

  test('validates password length', async () => {
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'a@b.com' } });
    fireEvent.input(inputs[1], { target: { value: 'short' } });
    fireEvent.input(inputs[2], { target: { value: 'short' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/)).toBeInTheDocument();
    });
  });

  test('validates password confirmation matches', async () => {
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'a@b.com' } });
    fireEvent.input(inputs[1], { target: { value: 'password123' } });
    fireEvent.input(inputs[2], { target: { value: 'different' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Passwords must match')).toBeInTheDocument();
    });
  });

  test('submits successfully and navigates', async () => {
    signUpMock.mockResolvedValueOnce({});
    const { container } = renderForm({ onSuccessRedirect: '/dashboard' });
    fillBaseFields(container);
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('navigates to "/" by default on success', async () => {
    signUpMock.mockResolvedValueOnce({});
    const { container } = renderForm();
    fillBaseFields(container);
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('lifts 422 field errors into Formik', async () => {
    signUpMock.mockRejectedValueOnce({
      status: 422,
      data: { errors: { email: ['Already taken'] } },
    });
    const { container } = renderForm();
    fillBaseFields(container);
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Already taken')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('does not crash on 429', async () => {
    signUpMock.mockRejectedValueOnce({ status: 429 });
    const { container } = renderForm();
    fillBaseFields(container);
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalled();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('shows general error on non-validation failures', async () => {
    signUpMock.mockRejectedValueOnce({
      status: 500,
      data: { message: 'Server exploded' },
    });
    const { container } = renderForm();
    fillBaseFields(container);
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Server exploded')).toBeInTheDocument();
    });
  });

  test('falls back to default message when error has none', async () => {
    signUpMock.mockRejectedValueOnce({ status: 500 });
    const { container } = renderForm();
    fillBaseFields(container);
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Unable to create account. Please try again.')).toBeInTheDocument();
    });
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
      </BrowserRouter>,
    );
    expect(screen.getByTestId('first-name')).toBeInTheDocument();
  });

  test('runs additionalSubmitTransform before submit', async () => {
    signUpMock.mockResolvedValueOnce({});
    const transform = jest.fn((v) => ({ ...v, transformed: true }));
    const { container } = render(
      <BrowserRouter>
        <SignUpForm additionalSubmitTransform={transform} />
      </BrowserRouter>,
    );
    fillBaseFields(container);
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(transform).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith(expect.objectContaining({ transformed: true }));
    });
  });
});
