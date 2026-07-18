import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Billing from '../Billing';
import { AuthProvider } from '../../context/AuthContext';
import axios from 'axios';

vi.mock('axios');

function renderBilling() {
  return render(
    <MemoryRouter initialEntries={['/billing']}>
      <AuthProvider>
        <Billing />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockMe() {
  return Promise.resolve({
    data: { user: { email: 'admin@example.com', tenant_id: 1 }, roles: ['super-admin'] },
  });
}

const sampleInvoice = {
  id: 1,
  type: 'recurring',
  device_count: 2,
  amount: '1000.00',
  period_start: '2026-07-17T00:00:00.000000Z',
  period_end: '2026-08-16T00:00:00.000000Z',
  status: 'paid',
};

describe('Billing', () => {
  beforeEach(() => {
    localStorage.setItem('tuwa_token', 'fake-token');
    vi.clearAllMocks();
  });

  it('renders invoice rows with formatted amount and status', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/billing/status')) {
        return Promise.resolve({ data: { billing_account: { status: 'active' }, outstanding_balance: 0 } });
      }
      if (url.includes('/invoices')) {
        return Promise.resolve({ data: { invoices: [sampleInvoice] } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderBilling();

    await waitFor(() => {
      expect(screen.getByText('KSh 1,000')).toBeInTheDocument();
    });

    expect(screen.getByText('paid')).toBeInTheDocument();
    expect(screen.getByText('recurring')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does NOT render raw ISO timestamps for invoice periods', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/billing/status')) {
        return Promise.resolve({ data: { billing_account: { status: 'active' }, outstanding_balance: 0 } });
      }
      if (url.includes('/invoices')) {
        return Promise.resolve({ data: { invoices: [sampleInvoice] } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderBilling();

    await waitFor(() => {
      expect(screen.getByText('KSh 1,000')).toBeInTheDocument();
    });

    // The raw ISO string should never appear directly in the DOM —
    // regression guard for the date-formatting fix applied earlier.
    expect(screen.queryByText(/2026-07-17T00:00:00/)).not.toBeInTheDocument();
  });

  it('renders account status and outstanding balance', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/billing/status')) {
        return Promise.resolve({ data: { billing_account: { status: 'blocked' }, outstanding_balance: 2500 } });
      }
      if (url.includes('/invoices')) {
        return Promise.resolve({ data: { invoices: [] } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderBilling();

    await waitFor(() => {
      expect(screen.getByText('blocked')).toBeInTheDocument();
    });

    expect(screen.getByText('KSh 2,500')).toBeInTheDocument();
  });

  it('shows an empty state when there are no invoices', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/billing/status')) {
        return Promise.resolve({ data: { billing_account: { status: 'active' }, outstanding_balance: 0 } });
      }
      if (url.includes('/invoices')) return Promise.resolve({ data: { invoices: [] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderBilling();

    await waitFor(() => {
      expect(screen.getByText('No invoices yet.')).toBeInTheDocument();
    });
  });

  it('renders correctly even if billing status request fails', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/billing/status')) return Promise.reject({ response: { status: 404 } });
      if (url.includes('/invoices')) return Promise.resolve({ data: { invoices: [sampleInvoice] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderBilling();

    await waitFor(() => {
      expect(screen.getByText('KSh 1,000')).toBeInTheDocument();
    });

    // Account status cards should simply not render, not crash the page.
    expect(screen.queryByText('Account status')).not.toBeInTheDocument();
  });
});
