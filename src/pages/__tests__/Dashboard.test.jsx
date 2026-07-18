import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { AuthProvider } from '../../context/AuthContext';
import axios from 'axios';

vi.mock('axios');

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </MemoryRouter>
  );
}

const sampleDashboardData = {
  summary: {
    health_percent: 75,
    devices_up: 3,
    devices_down: 1,
    devices_total: 4,
  },
  devices: [
    { id: 1, name: 'Core Router', ip_address: '10.0.0.1', status: 'up' },
    { id: 2, name: 'Edge Switch', ip_address: '10.0.0.2', status: 'down' },
  ],
  recent_events: [
    { id: 1, severity: 'critical', message: 'Edge Switch went offline.' },
    { id: 2, severity: 'info', message: 'Core Router recovered.' },
  ],
};

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.setItem('tuwa_token', 'fake-token');
    vi.clearAllMocks();
  });

  it('renders summary stats and device list from real API data', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) {
        return Promise.resolve({ data: { user: { email: 'admin@example.com' }, roles: ['super-admin'] } });
      }
      if (url.includes('/dashboard')) {
        return Promise.resolve({ data: sampleDashboardData });
      }
      if (url.includes('/billing/status')) {
        return Promise.resolve({ data: { billing_account: { status: 'active' }, outstanding_balance: 0 } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Core Router')).toBeInTheDocument();
    });

    expect(screen.getByText('Edge Switch')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Edge Switch went offline.')).toBeInTheDocument();
  });

  it('shows a trial banner when the account is in trial', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) {
        return Promise.resolve({ data: { user: { email: 'admin@example.com' }, roles: ['operator'] } });
      }
      if (url.includes('/dashboard')) {
        return Promise.resolve({ data: sampleDashboardData });
      }
      if (url.includes('/billing/status')) {
        return Promise.resolve({
          data: { billing_account: { status: 'trial', trial_ends_at: '2026-08-01T00:00:00Z' }, outstanding_balance: 0 },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Trial period/)).toBeInTheDocument();
    });
  });

  it('shows a blocked account warning with the outstanding balance', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) {
        return Promise.resolve({ data: { user: { email: 'admin@example.com' }, roles: ['operator'] } });
      }
      if (url.includes('/dashboard')) {
        return Promise.resolve({ data: sampleDashboardData });
      }
      if (url.includes('/billing/status')) {
        return Promise.resolve({
          data: { billing_account: { status: 'blocked' }, outstanding_balance: 1500 },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Account blocked/)).toBeInTheDocument();
    });
    expect(screen.getByText(/1500/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no devices', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) {
        return Promise.resolve({ data: { user: { email: 'admin@example.com' }, roles: ['operator'] } });
      }
      if (url.includes('/dashboard')) {
        return Promise.resolve({
          data: { summary: { health_percent: null, devices_up: 0, devices_down: 0, devices_total: 0 }, devices: [], recent_events: [] },
        });
      }
      if (url.includes('/billing/status')) {
        return Promise.resolve({ data: { billing_account: { status: 'active' }, outstanding_balance: 0 } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('No devices yet.')).toBeInTheDocument();
    });
    expect(screen.getByText('No events yet.')).toBeInTheDocument();
  });
});
