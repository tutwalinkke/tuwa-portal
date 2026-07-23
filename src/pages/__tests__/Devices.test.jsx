import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
};

describe('Devices', () => {
  beforeEach(() => {
    localStorage.setItem('tuwa_token', 'fake-token');
    vi.clearAllMocks();
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

  it('generates a code with the selected type and name, and shows both provisioning steps', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/devices')) return Promise.resolve({ data: { devices: [] } });
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

    await waitFor(() => {
      expect(screen.getByText('a-real-generated-code')).toBeInTheDocument();
    });

    // Both provisioning steps should be shown, using the real code.
    expect(screen.getByText(/Step 1/)).toBeInTheDocument();
    expect(screen.getByText(/Step 2/)).toBeInTheDocument();
    expect(screen.getByText(/Will be added as "Test OLT"/)).toBeInTheDocument();
  });
});
