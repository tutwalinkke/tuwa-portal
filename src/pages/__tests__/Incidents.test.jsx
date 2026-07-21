import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Incidents from '../Incidents';
import { AuthProvider } from '../../context/AuthContext';
import axios from 'axios';

vi.mock('axios');

function renderIncidents() {
  return render(
    <MemoryRouter initialEntries={['/incidents']}>
      <AuthProvider>
        <Incidents />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockMe() {
  return Promise.resolve({
    data: { user: { email: 'admin@example.com', tenant_id: 1 }, roles: ['super-admin'] },
  });
}

const openIncident = {
  id: 1,
  status: 'open',
  acknowledged_at: null,
  escalated_at: null,
  created_at: '2026-07-21T20:00:00.000000Z',
  device: { id: 3, name: 'Test Router', ip_address: '10.0.0.1' },
  device_event: { severity: 'critical', message: 'Test Router went offline.' },
};

describe('Incidents', () => {
  beforeEach(() => {
    localStorage.setItem('tuwa_token', 'fake-token');
    vi.clearAllMocks();
  });

  it('renders an open incident with its badges and message', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/incidents')) return Promise.resolve({ data: { incidents: [openIncident] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderIncidents();

    await waitFor(() => {
      expect(screen.getByText('Test Router')).toBeInTheDocument();
    });

    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('Test Router went offline.')).toBeInTheDocument();
  });

  it('shows an empty state when there are no incidents', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/incidents')) return Promise.resolve({ data: { incidents: [] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderIncidents();

    await waitFor(() => {
      expect(screen.getByText(/No incidents/)).toBeInTheDocument();
    });
  });

  it('acknowledging an incident calls the API and reloads the list', async () => {
    let acknowledgeWasCalled = false;

    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/incidents')) {
        return Promise.resolve({
          data: { incidents: acknowledgeWasCalled ? [] : [openIncident] },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    axios.post.mockImplementation((url) => {
      if (url.includes('/acknowledge')) {
        acknowledgeWasCalled = true;
        return Promise.resolve({ data: { incident: { ...openIncident, status: 'acknowledged' } } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderIncidents();

    await waitFor(() => {
      expect(screen.getByText('Test Router')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Acknowledge'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/incidents/1/acknowledge'),
        {},
        expect.anything()
      );
    });
  });

  it('does not show the Acknowledge button for an already-acknowledged incident', async () => {
    const acknowledged = { ...openIncident, status: 'acknowledged', acknowledged_at: '2026-07-21T20:05:00.000000Z' };

    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/incidents')) return Promise.resolve({ data: { incidents: [acknowledged] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderIncidents();

    await waitFor(() => {
      expect(screen.getByText('Test Router')).toBeInTheDocument();
    });

    expect(screen.queryByText('Acknowledge')).not.toBeInTheDocument();
    expect(screen.getByText('Resolve')).toBeInTheDocument();
  });

  it('does not show either action button for a resolved incident', async () => {
    const resolved = { ...openIncident, status: 'resolved', acknowledged_at: '2026-07-21T20:05:00.000000Z' };

    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/incidents')) return Promise.resolve({ data: { incidents: [resolved] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderIncidents();

    await waitFor(() => {
      expect(screen.getByText('Test Router')).toBeInTheDocument();
    });

    expect(screen.queryByText('Acknowledge')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolve')).not.toBeInTheDocument();
  });
});
