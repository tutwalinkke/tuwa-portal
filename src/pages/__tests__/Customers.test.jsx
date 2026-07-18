import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Customers from '../Customers';
import { AuthProvider } from '../../context/AuthContext';
import axios from 'axios';

vi.mock('axios');

function renderCustomers() {
  return render(
    <MemoryRouter initialEntries={['/customers']}>
      <AuthProvider>
        <Customers />
      </AuthProvider>
    </MemoryRouter>
  );
}

function mockMe() {
  return Promise.resolve({
    data: { user: { email: 'admin@example.com', tenant_id: 1 }, roles: ['super-admin'] },
  });
}

describe('Customers', () => {
  beforeEach(() => {
    localStorage.setItem('tuwa_token', 'fake-token');
    vi.clearAllMocks();
  });

  it('renders customers with device counts and status', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/customers')) {
        return Promise.resolve({
          data: {
            customers: [
              { id: 1, name: 'Jane Mwangi', phone: '0722123456', email: 'jane@example.com', devices_count: 2, status: 'active' },
            ],
          },
        });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderCustomers();

    await waitFor(() => {
      expect(screen.getByText('Jane Mwangi')).toBeInTheDocument();
    });

    expect(screen.getByText('0722123456')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('shows an empty state when there are no customers', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/customers')) return Promise.resolve({ data: { customers: [] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    renderCustomers();

    await waitFor(() => {
      expect(screen.getByText('No customers yet.')).toBeInTheDocument();
    });
  });

  it('opens the add-customer form when the button is clicked', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/customers')) return Promise.resolve({ data: { customers: [] } });
      return Promise.reject(new Error('unexpected URL: ' + url));
    });

    const user = userEvent.setup();
    renderCustomers();

    await waitFor(() => {
      expect(screen.getByText('No customers yet.')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '+ Add Customer' }));

    expect(screen.getByText('Save Customer')).toBeInTheDocument();
  });

  it('submits the form and reloads the customer list', async () => {
    let getCallCount = 0;
    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) return mockMe();
      if (url.includes('/customers')) {
        getCallCount++;
        const customers = getCallCount === 1
          ? []
          : [{ id: 1, name: 'New Customer', phone: '', email: '', devices_count: 0, status: 'active' }];
        return Promise.resolve({ data: { customers } });
      }
      return Promise.reject(new Error('unexpected URL: ' + url));
    });
    axios.post.mockResolvedValue({ data: { customer: { id: 1, name: 'New Customer' } } });

    const user = userEvent.setup();
    renderCustomers();

    await waitFor(() => {
      expect(screen.getByText('No customers yet.')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '+ Add Customer' }));
    await user.type(screen.getByLabelText(/^Name$/i) || screen.getByRole('textbox'), 'New Customer');

    // Fall back to querying the name field directly by its position in the
    // form, since it has no explicit htmlFor/id association with its label.
    const nameInput = screen.getAllByRole('textbox')[0];
    await user.clear(nameInput);
    await user.type(nameInput, 'New Customer');

    await user.click(screen.getByRole('button', { name: 'Save Customer' }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/customers'),
        expect.objectContaining({ name: 'New Customer' }),
        expect.anything()
      );
    });

    await waitFor(() => {
      expect(screen.getByText('New Customer')).toBeInTheDocument();
    });
  });
});
