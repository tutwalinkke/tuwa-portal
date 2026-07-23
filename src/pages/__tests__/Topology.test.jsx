import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Topology from '../Topology';
import { AuthProvider } from '../../context/AuthContext';
import axios from 'axios';

vi.mock('axios');

function renderTopology() {
  return render(
    <MemoryRouter initialEntries={['/topology']}>
      <AuthProvider>
        <Topology />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockMe() {
  return Promise.resolve({
    data: { user: { email: 'admin@example.com', tenant_id: 1 }, roles: ['super-admin'] },
  });
}

const sampleDevices = [
  { id: 1, name: 'Router A', ip_address: '10.0.0.1', type: 'router', status: 'up', site: null },
  { id: 2, name: 'Switch B', ip_address: '10.0.0.2', type: 'switch', status: 'down', site: null },
];

const sampleLinks = [
  { id: 1, device_a_id: 1, device_b_id: 2, link_type: 'fiber', description: null },
];

describe('Topology', () => {
  beforeEach(() => {
    localStorage.setItem('tuwa_token', 'fake-token');
    vi.clearAllMocks();
  });

  it('renders device names and the declared link between them', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/topology')) {
        return Promise.resolve({ data: { devices: sampleDevices, links: sampleLinks } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderTopology();

    await waitFor(() => {
      expect(screen.getByText('Router A')).toBeInTheDocument();
    });

    expect(screen.getByText('Switch B')).toBeInTheDocument();
    expect(screen.getByText('fiber')).toBeInTheDocument();
  });

  it('renders the declared links list with a working remove action', async () => {
    let deleteWasCalled = false;

    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/topology')) {
        return Promise.resolve({
          data: { devices: sampleDevices, links: deleteWasCalled ? [] : sampleLinks },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    axios.delete.mockImplementation((url) => {
      if (url.includes('/topology/links/1')) {
        deleteWasCalled = true;
        return Promise.resolve({ data: { message: 'Link deleted.' } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderTopology();

    await waitFor(() => {
      expect(screen.getByText(/Router A.*Switch B/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Remove'));

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/topology/links/1'),
        expect.anything()
      );
    });
  });

  it('shows an empty state when there are no devices', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/topology')) return Promise.resolve({ data: { devices: [], links: [] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderTopology();

    await waitFor(() => {
      expect(screen.getByText('No devices to display.')).toBeInTheDocument();
    });
  });

  it('opens the add-link form and submits a new link', async () => {
    let createWasCalled = false;

    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/topology')) {
        return Promise.resolve({
          data: { devices: sampleDevices, links: createWasCalled ? sampleLinks : [] },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    axios.post.mockImplementation((url) => {
      if (url.includes('/topology/links')) {
        createWasCalled = true;
        return Promise.resolve({ data: { link: sampleLinks[0] } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderTopology();

    await waitFor(() => {
      expect(screen.getByText('Router A')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Add Link'));

    fireEvent.change(screen.getByLabelText('Device A'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Device B'), { target: { value: '2' } });
    fireEvent.click(screen.getByText('Create Link'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/topology/links'),
        expect.objectContaining({ device_a_id: '1', device_b_id: '2' }),
        expect.anything()
      );
    });
  });

  it('groups devices into real tiers derived from their actual type (router=Core, switch=Distribution)', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/topology')) {
        return Promise.resolve({ data: { devices: sampleDevices, links: sampleLinks } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderTopology();

    await waitFor(() => {
      expect(screen.getByText('Router A')).toBeInTheDocument();
    });

    // The component's real DOM text is 'Core'/'Distribution' —
    // the ALL-CAPS appearance in the browser is CSS text-transform,
    // not the actual text content, which is what RTL matches against.
    expect(screen.getByText('Core')).toBeInTheDocument();
    expect(screen.getByText('Distribution')).toBeInTheDocument();
  });

  it('shows real device details when a node is clicked', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/topology')) {
        return Promise.resolve({ data: { devices: sampleDevices, links: sampleLinks } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderTopology();

    await waitFor(() => {
      expect(screen.getByText('Router A')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Router A'));

    await waitFor(() => {
      expect(screen.getByText('IP Address')).toBeInTheDocument();
    });

    // '10.0.0.1' genuinely appears twice — once as the SVG node
    // label, once in the details panel — both correct, real
    // behavior. getAllByText confirms both are present rather than
    // asserting on a single, ambiguous match.
    expect(screen.getAllByText('10.0.0.1').length).toBeGreaterThanOrEqual(2);
  });

});