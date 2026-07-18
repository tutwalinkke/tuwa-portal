import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import { AuthProvider } from '../../context/AuthContext';
import axios from 'axios';

vi.mock('axios');

function renderLogin() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // AuthProvider's initial mount checks for an existing token via /me —
    // return a rejection since no token exists in a fresh test environment.
    axios.get.mockRejectedValue({ response: { status: 401 } });
  });

  it('renders the sign-in form', async () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
  });

  it('shows an error message on invalid credentials', async () => {
    axios.post.mockRejectedValue({ response: { status: 401 } });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Enter password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Incorrect email or password.')).toBeInTheDocument();
    });
  });

  it('shows a generic error on server failure', async () => {
    axios.post.mockRejectedValue({ response: { status: 500 } });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Enter password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Try again.')).toBeInTheDocument();
    });
  });

  it('calls the login API with entered credentials', async () => {
    axios.post.mockResolvedValue({
      data: { token: 'fake-token', user: { email: 'test@example.com' }, roles: [] },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Enter password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
        { email: 'test@example.com', password: 'password123' }
      );
    });
  });

  it('disables the submit button while submitting', async () => {
    let resolveLogin;
    axios.post.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; }));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Enter password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

    // Resolve the pending login and wait for the resulting state updates
    // (setToken/setUser/navigate) to fully settle before the test ends —
    // otherwise React flags an update happening outside act().
    resolveLogin({ data: { token: 't', user: { email: 'test@example.com' }, roles: [] } });

    await waitFor(() => {
      expect(localStorage.getItem('tuwa_token')).toBe('t');
    });
  });
});
