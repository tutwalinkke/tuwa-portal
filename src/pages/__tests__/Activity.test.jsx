import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Activity from '../Activity';
import { AuthProvider } from '../../context/AuthContext';
import axios from 'axios';

vi.mock('axios');

function renderActivity() {
  return render(
    <MemoryRouter initialEntries={['/activity']}>
      <AuthProvider>
        <Activity />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockMe() {
  return Promise.resolve({
    data: { user: { email: 'admin@example.com', tenant_id: 1 }, roles: ['super-admin'] },
  });
}

describe('Activity', () => {
  beforeEach(() => {
    localStorage.setItem('tuwa_token', 'fake-token');
    vi.clearAllMocks();
  });

  it('merges and sorts Identity and NOC events chronologically', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('identity.tuwalink.com/api/v1/activity')) {
        return Promise.resolve({
          data: {
            activities: [
              { id: 1, description: 'User logged in', causer: { name: 'Admin', email: 'admin@example.com' }, created_at: '2026-07-18T10:00:00Z' },
            ],
          },
        });
      }
      if (url.includes('noc.tuwalink.com/api/v1/activity')) {
        return Promise.resolve({
          data: {
            activities: [
              { id: 1, description: 'Customer created: Jane', actor_name: 'Admin', actor_email: 'admin@example.com', created_at: '2026-07-18T11:00:00Z' },
            ],
          },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderActivity();

    await waitFor(() => {
      expect(screen.getByText('Customer created: Jane')).toBeInTheDocument();
    });

    expect(screen.getByText('User logged in')).toBeInTheDocument();
    expect(screen.getByText('IDENTITY')).toBeInTheDocument();
    expect(screen.getByText('NOC')).toBeInTheDocument();

    // NOC event (11:00) is more recent than Identity event (10:00),
    // so it should render first in the DOM.
    const descriptions = screen.getAllByText(/Customer created|User logged in/);
    expect(descriptions[0]).toHaveTextContent('Customer created: Jane');
  });

  it('shows an empty state when there is no activity', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/activity')) return Promise.resolve({ data: { activities: [] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderActivity();

    await waitFor(() => {
      expect(screen.getByText('No activity recorded yet.')).toBeInTheDocument();
    });
  });

  it('still renders correctly if one source fails but the other succeeds', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('identity.tuwalink.com/api/v1/activity')) {
        return Promise.reject({ response: { status: 500 } });
      }
      if (url.includes('noc.tuwalink.com/api/v1/activity')) {
        return Promise.resolve({
          data: { activities: [{ id: 1, description: 'Device created: Router', actor_name: 'Admin', actor_email: 'a@example.com', created_at: '2026-07-18T10:00:00Z' }] },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderActivity();

    await waitFor(() => {
      expect(screen.getByText('Device created: Router')).toBeInTheDocument();
    });
  });
});
