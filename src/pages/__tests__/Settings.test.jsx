import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from '../Settings';
import { AuthProvider } from '../../context/AuthContext';
import axios from 'axios';

vi.mock('axios');

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <AuthProvider>
        <Settings />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockMe() {
  return Promise.resolve({
    data: { user: { email: 'admin@example.com', tenant_id: 1 }, roles: ['super-admin'] },
  });
}

describe('Settings', () => {
  beforeEach(() => {
    localStorage.setItem('tuwa_token', 'fake-token');
    vi.clearAllMocks();
  });

  it('shows disabled status and an enable button when 2FA is off', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/two-factor/status')) return Promise.resolve({ data: { enabled: false } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    expect(screen.getByText('Enable two-factor authentication')).toBeInTheDocument();
  });

  it('shows enabled status and a disable option when 2FA is on', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/two-factor/status')) return Promise.resolve({ data: { enabled: true } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });

    expect(screen.getByText('Disable two-factor authentication')).toBeInTheDocument();
  });

  it('begins setup and shows a QR code with the real secret', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/two-factor/status')) return Promise.resolve({ data: { enabled: false } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    axios.post.mockImplementation((url) => {
      if (url.includes('/two-factor/setup')) {
        return Promise.resolve({
          data: { qr_code_url: 'otpauth://totp/Tuwa:admin@example.com?secret=REALSECRET123', secret: 'REALSECRET123' },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Enable two-factor authentication')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Enable two-factor authentication'));

    await waitFor(() => {
      expect(screen.getByText('REALSECRET123')).toBeInTheDocument();
    });
  });

  it('confirms setup and shows real recovery codes, then hides them once acknowledged', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/two-factor/status')) return Promise.resolve({ data: { enabled: false } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    axios.post.mockImplementation((url, body) => {
      if (url.includes('/two-factor/setup')) {
        return Promise.resolve({
          data: { qr_code_url: 'otpauth://totp/Tuwa:admin@example.com?secret=REALSECRET123', secret: 'REALSECRET123' },
        });
      }
      if (url.includes('/two-factor/confirm')) {
        expect(body).toEqual({ code: '123456' });
        return Promise.resolve({ data: { recovery_codes: ['aaaa-1111', 'bbbb-2222'] } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Enable two-factor authentication')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Enable two-factor authentication'));

    await waitFor(() => {
      expect(screen.getByText('REALSECRET123')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('aaaa-1111')).toBeInTheDocument();
      expect(screen.getByText('bbbb-2222')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("I've saved these codes"));

    await waitFor(() => {
      expect(screen.queryByText('aaaa-1111')).not.toBeInTheDocument();
    });
  });

  it('shows an error when confirming with an invalid code', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/two-factor/status')) return Promise.resolve({ data: { enabled: false } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    axios.post.mockImplementation((url) => {
      if (url.includes('/two-factor/setup')) {
        return Promise.resolve({
          data: { qr_code_url: 'otpauth://totp/Tuwa:admin@example.com?secret=REALSECRET123', secret: 'REALSECRET123' },
        });
      }
      if (url.includes('/two-factor/confirm')) {
        return Promise.reject({ response: { status: 422 } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Enable two-factor authentication')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Enable two-factor authentication'));

    await waitFor(() => {
      expect(screen.getByText('REALSECRET123')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '000000' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Invalid code. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables 2FA with the correct password', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/two-factor/status')) return Promise.resolve({ data: { enabled: true } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    axios.post.mockImplementation((url, body) => {
      if (url.includes('/two-factor/disable')) {
        expect(body).toEqual({ password: 'real-password' });
        return Promise.resolve({ data: {} });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Disable two-factor authentication')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Disable two-factor authentication'));
    fireEvent.change(screen.getByLabelText('Confirm your password'), { target: { value: 'real-password' } });
    fireEvent.click(screen.getByText('Disable'));

    await waitFor(() => {
      expect(screen.getByText('Enable two-factor authentication')).toBeInTheDocument();
    });
  });

  it('shows an error when disabling with an incorrect password', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/two-factor/status')) return Promise.resolve({ data: { enabled: true } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    axios.post.mockImplementation((url) => {
      if (url.includes('/two-factor/disable')) {
        return Promise.reject({ response: { status: 401 } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Disable two-factor authentication')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Disable two-factor authentication'));
    fireEvent.change(screen.getByLabelText('Confirm your password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByText('Disable'));

    await waitFor(() => {
      expect(screen.getByText('Incorrect password.')).toBeInTheDocument();
    });
  });
});
