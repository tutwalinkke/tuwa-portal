import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Subnets from '../Subnets';
import { AuthProvider } from '../../context/AuthContext';
import axios from 'axios';

vi.mock('axios');

function renderSubnets() {
  return render(
    <MemoryRouter initialEntries={['/subnets']}>
      <AuthProvider>
        <Subnets />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockMe(overrides = {}) {
  return Promise.resolve({
    data: { user: { email: 'admin@example.com', tenant_id: 1 }, roles: ['super-admin'], ...overrides },
  });
}

describe('Subnets', () => {
  beforeEach(() => {
    localStorage.setItem('tuwa_token', 'fake-token');
    vi.clearAllMocks();
  });

  it('renders subnets with allocated and available counts', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/subnets')) {
        return Promise.resolve({
          data: {
            subnets: [
              { id: 1, cidr: '10.0.0.0/29', description: 'Test subnet', site: 'HQ', allocated_count: 2, available_count: 4 },
            ],
          },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderSubnets();

    await waitFor(() => {
      expect(screen.getByText('10.0.0.0/29')).toBeInTheDocument();
    });

    expect(screen.getByText('Test subnet')).toBeInTheDocument();
    expect(screen.getByText('HQ')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows an empty state when there are no subnets', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/subnets')) return Promise.resolve({ data: { subnets: [] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderSubnets();

    await waitFor(() => {
      expect(screen.getByText('No subnets yet.')).toBeInTheDocument();
    });
  });

  it('falls back to em dash for missing description and site', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/subnets')) {
        return Promise.resolve({
          data: {
            subnets: [
              { id: 1, cidr: '10.0.1.0/29', description: null, site: null, allocated_count: 0, available_count: 6 },
            ],
          },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderSubnets();

    await waitFor(() => {
      expect(screen.getByText('10.0.1.0/29')).toBeInTheDocument();
    });

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(2);
  });

  it('shows an error message when the subnets request fails', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/subnets')) return Promise.reject({ response: { status: 500 } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderSubnets();

    await waitFor(() => {
      expect(screen.getByText('Could not load subnets.')).toBeInTheDocument();
    });
  });
});
