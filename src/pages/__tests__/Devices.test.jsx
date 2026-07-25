import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Devices from '../Devices';
import { AuthProvider } from '../../context/AuthContext';
import axios from 'axios';

vi.mock('axios');

function renderDevices() {
  return render(
    <MemoryRouter initialEntries={['/devices']}>
      <AuthProvider>
        <Devices />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockMe() {
  return Promise.resolve({
    data: { user: { email: 'admin@example.com', tenant_id: 1 }, roles: ['super-admin'] },
  });
}

const sampleDevice = {
  id: 1,
  name: 'Core Router',
  ip_address: '10.0.0.1',
  type: 'router',
  status: 'up',
  site: 'Main POP',
  wireguard_ip: null,
  cpu_percent: null,
  memory_percent: null,
};

const monitoredDevice = {
  id: 2,
  name: 'Monitored Router',
  ip_address: '10.0.0.2',
  type: 'router',
  status: 'up',
  site: 'Main POP',
  wireguard_ip: '10.20.0.5',
  cpu_percent: 42,
  memory_percent: 88,
};

describe('Devices', () => {
  beforeEach(() => {
    localStorage.setItem('tuwa_token', 'fake-token');
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders devices with status badges', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/devices')) return Promise.resolve({ data: { devices: [sampleDevice] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDevices();

    await waitFor(() => {
      expect(screen.getByText('Core Router')).toBeInTheDocument();
    });

    expect(screen.getByText('up')).toBeInTheDocument();
  });

  it('shows an empty state when there are no devices', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/devices')) return Promise.resolve({ data: { devices: [] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDevices();

    await waitFor(() => {
      expect(screen.getByText('No devices yet. Add one to get started.')).toBeInTheDocument();
    });
  });

  it('opens the provisioning panel with a type dropdown defaulting to Router', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/devices')) return Promise.resolve({ data: { devices: [] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDevices();

    await waitFor(() => {
      expect(screen.getByText('No devices yet. Add one to get started.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Add Device'));

    expect(screen.getByLabelText('Device type')).toHaveValue('router');
    expect(screen.getByLabelText('Device name (optional)')).toBeInTheDocument();
  });

  it('generates a code and shows the single one-paste command containing it', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/devices')) return Promise.resolve({ data: { devices: [] } });
      if (url.includes('/status')) return Promise.resolve({ data: { status: 'waiting_for_redemption' } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    axios.post.mockImplementation((url) => {
      if (url.includes('/provisioning-codes')) {
        return Promise.resolve({
          data: { code: 'a-real-generated-code', expires_at: '2026-07-23T22:00:00.000000Z' },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDevices();

    await waitFor(() => {
      expect(screen.getByText('No devices yet. Add one to get started.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Add Device'));
    fireEvent.change(screen.getByLabelText('Device type'), { target: { value: 'olt' } });
    fireEvent.change(screen.getByLabelText('Device name (optional)'), { target: { value: 'Test OLT' } });
    fireEvent.click(screen.getByText('Generate Code'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/provisioning-codes'),
        expect.objectContaining({ device_type: 'olt', device_name: 'Test OLT' }),
        expect.anything()
      );
    });

    // The one-paste command should contain the real generated code —
    // no separate "Step 1/2/3" instructions to look for anymore.
    await waitFor(() => {
      expect(screen.getByText(/a-real-generated-code/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Waiting for the code to be run on the router/)).toBeInTheDocument();
  });

  it('polls status and shows the success banner once the device connects', async () => {
    let pollCount = 0;

    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/devices')) return Promise.resolve({ data: { devices: [] } });
      if (url.includes('/status')) {
        pollCount += 1;
        if (pollCount === 1) return Promise.resolve({ data: { status: 'waiting_for_connection' } });
        return Promise.resolve({
          data: { status: 'connected', device_name: 'tuwatest', device_id: 5 },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    axios.post.mockImplementation((url) => {
      if (url.includes('/provisioning-codes')) {
        return Promise.resolve({
          data: { code: 'a-real-generated-code', expires_at: '2026-07-23T22:00:00.000000Z' },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDevices();

    await waitFor(() => {
      expect(screen.getByText('No devices yet. Add one to get started.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Add Device'));
    fireEvent.click(screen.getByText('Generate Code'));

    await waitFor(() => {
      expect(screen.getByText(/a-real-generated-code/)).toBeInTheDocument();
    });

    // Advance past two 3-second poll intervals, wrapped in act()
    // since each tick triggers a real React state update.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    await waitFor(() => {
      expect(screen.getByText(/tuwatest.*connected successfully/)).toBeInTheDocument();
    });
  });

  it('shows real CPU and memory readouts for a device that has been polled', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/devices')) return Promise.resolve({ data: { devices: [monitoredDevice] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDevices();

    await waitFor(() => {
      expect(screen.getByText('Monitored Router')).toBeInTheDocument();
    });

    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  it('hides the CPU/memory readout for a device that has never been polled', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/devices')) return Promise.resolve({ data: { devices: [sampleDevice] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDevices();

    await waitFor(() => {
      expect(screen.getByText('Core Router')).toBeInTheDocument();
    });

    expect(screen.queryByText('CPU')).not.toBeInTheDocument();
    expect(screen.queryByText('Memory')).not.toBeInTheDocument();
  });

  it('expands to show real config backups when Backups is clicked', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/config-backups')) {
        return Promise.resolve({
          data: { backups: [{ id: 1, size_bytes: 1437, taken_at: '2026-07-25T10:28:52.000000Z' }] },
        });
      }
      if (url.includes('/devices')) return Promise.resolve({ data: { devices: [monitoredDevice] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDevices();

    await waitFor(() => {
      expect(screen.getByText('Monitored Router')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Backups'));

    await waitFor(() => {
      expect(screen.getByText('1.4 KB')).toBeInTheDocument();
    });
  });

  it('shows the real full content when a backup is viewed', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/config-backups/1')) {
        return Promise.resolve({
          data: { backup: { id: 1, content: '# real router export content', taken_at: '2026-07-25T10:28:52.000000Z' } },
        });
      }
      if (url.includes('/config-backups')) {
        return Promise.resolve({
          data: { backups: [{ id: 1, size_bytes: 1437, taken_at: '2026-07-25T10:28:52.000000Z' }] },
        });
      }
      if (url.includes('/devices')) return Promise.resolve({ data: { devices: [monitoredDevice] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDevices();

    await waitFor(() => {
      expect(screen.getByText('Monitored Router')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Backups'));

    await waitFor(() => {
      expect(screen.getByText('1.4 KB')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('View'));

    await waitFor(() => {
      expect(screen.getByText('# real router export content')).toBeInTheDocument();
    });
  });

  it('shows a real empty state for a device with no backups yet', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/config-backups')) return Promise.resolve({ data: { backups: [] } });
      if (url.includes('/devices')) return Promise.resolve({ data: { devices: [sampleDevice] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderDevices();

    await waitFor(() => {
      expect(screen.getByText('Core Router')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Backups'));

    await waitFor(() => {
      expect(screen.getByText(/No config backups yet/)).toBeInTheDocument();
    });
  });
});