import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SignInForm from './index';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const signInMock = jest.fn();
jest.mock('../../../services/requests/AuthRequests', () => ({
  __esModule: true,
  default: { signIn: (...args: unknown[]) => signInMock(...args) },
  signIn: (...args: unknown[]) => signInMock(...args),
}));

const renderForm = (props: Record<string, unknown> = {}) =>
  render(
    <BrowserRouter>
      <SignInForm {...props} />
    </BrowserRouter>,
  );

beforeEach(() => {
  mockNavigate.mockReset();
  signInMock.mockReset();
  localStorage.clear();
});

describe('SignInForm', () => {
  test('renders all fields, forgot link, and submit button', () => {
    renderForm();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('forgot password?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  test('shows validation errors when submitted empty', async () => {
    const { container } = renderForm();
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Email required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
    expect(signInMock).not.toHaveBeenCalled();
  });

  test('submits and navigates on success', async () => {
    signInMock.mockResolvedValueOnce(true);
    const { container } = renderForm({ onSuccessRedirect: '/home' });
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'a@b.com' } });
    fireEvent.input(inputs[1], { target: { value: 'pw' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home');
    });
  });

  test('uses login_redirect from localStorage when present', async () => {
    localStorage.setItem('login_redirect', '/somewhere');
    signInMock.mockResolvedValueOnce(true);
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'a@b.com' } });
    fireEvent.input(inputs[1], { target: { value: 'pw' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/somewhere');
    });
    expect(localStorage.getItem('login_redirect')).toBeNull();
  });

  test('falls back to "/" when no redirect provided', async () => {
    signInMock.mockResolvedValueOnce(true);
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'a@b.com' } });
    fireEvent.input(inputs[1], { target: { value: 'pw' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  test('sets generic error when sign-in returns falsy', async () => {
    signInMock.mockResolvedValueOnce(false);
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'a@b.com' } });
    fireEvent.input(inputs[1], { target: { value: 'pw' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Unknown Error')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('sets 401 invalid-credentials error', async () => {
    signInMock.mockRejectedValueOnce({ status: 401 });
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'a@b.com' } });
    fireEvent.input(inputs[1], { target: { value: 'pw' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(screen.getByText('Invalid Login Credentials.')).toBeInTheDocument();
    });
  });

  test('does not crash on non-401 error', async () => {
    signInMock.mockRejectedValueOnce({ status: 500 });
    const { container } = renderForm();
    const inputs = container.querySelectorAll('input');
    fireEvent.input(inputs[0], { target: { value: 'a@b.com' } });
    fireEvent.input(inputs[1], { target: { value: 'pw' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    await waitFor(() => {
      expect(signInMock).toHaveBeenCalled();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
