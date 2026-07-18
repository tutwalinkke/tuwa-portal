import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { nocApi } from '../lib/api';

function StatusBadge({ status }) {
  const styles = {
    active: 'text-status-up bg-status-up/10 border-status-up/30',
    suspended: 'text-status-warn bg-status-warn/10 border-status-warn/30',
    cancelled: 'text-status-down bg-status-down/10 border-status-down/30',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono uppercase border ${styles[status] || ''}`}>
      {status}
    </span>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', service_address: '' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function loadCustomers() {
    setLoading(true);
    nocApi
      .customers()
      .then((res) => setCustomers(res.data.customers || []))
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Could not load customers.');
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCustomers();
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await nocApi.createCustomer(formData);
      setFormData({ name: '', phone: '', email: '', service_address: '' });
      setShowForm(false);
      loadCustomers();
    } catch (err) {
      setError('Could not create customer.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-mist-50 font-semibold">Customers</h1>
          <p className="text-mist-400 text-sm">{customers.length} customer(s)</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-signal hover:bg-signal-dim text-ink-950 font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Customer'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-ink-900 border border-ink-800 rounded-lg p-5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="customer-name" className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">Name</label>
              <input
                id="customer-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2 text-mist-50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
              />
            </div>
            <div>
              <label htmlFor="customer-phone" className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">Phone</label>
              <input
                id="customer-phone"
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2 text-mist-50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
              />
            </div>
            <div>
              <label htmlFor="customer-email" className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">Email</label>
              <input
                id="customer-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2 text-mist-50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
              />
            </div>
            <div>
              <label htmlFor="customer-address" className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">Service Address</label>
              <input
                id="customer-address"
                type="text"
                value={formData.service_address}
                onChange={(e) => setFormData({ ...formData, service_address: e.target.value })}
                className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2 text-mist-50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-signal hover:bg-signal-dim disabled:opacity-50 text-ink-950 font-semibold rounded px-4 py-2 text-sm transition-colors"
          >
            {submitting ? 'Saving…' : 'Save Customer'}
          </button>
        </form>
      )}

      {loading && <p className="text-mist-400 font-mono text-sm">Loading…</p>}
      {error && <p className="text-status-down font-mono text-sm">{error}</p>}

      {!loading && !error && (
        <div className="bg-ink-900 border border-ink-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left">
                <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide">Phone</th>
                <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide text-right">Devices</th>
                <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-mist-400">
                    No customers yet.
                  </td>
                </tr>
              )}
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3 text-mist-50 font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-mist-200 font-mono">{c.phone || '—'}</td>
                  <td className="px-5 py-3 text-mist-200">{c.email || '—'}</td>
                  <td className="px-5 py-3 text-mist-200 font-mono text-right">{c.devices_count ?? 0}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
