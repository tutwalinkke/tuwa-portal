import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import CardHead from '../components/CardHead';
import { nocApi } from '../lib/api';

function StatusBadge({ status }) {
  const styles = {
    paid: 'text-status-up bg-status-up/10 border-status-up/30',
    pending: 'text-status-warn bg-status-warn/10 border-status-warn/30',
    overdue: 'text-status-down bg-status-down/10 border-status-down/30',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono uppercase border ${styles[status] || ''}`}>
      {status}
    </span>
  );
}

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [billingStatus, setBillingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([nocApi.invoices(), nocApi.billingStatus().catch(() => null)])
      .then(([invRes, statusRes]) => {
        setInvoices(invRes.data.invoices || []);
        if (statusRes) setBillingStatus(statusRes.data);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Could not load billing data.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-mist-50 font-semibold">Billing</h1>
        <p className="text-mist-400 text-sm">Invoices and account status</p>
      </div>

      {loading && <p className="text-mist-400 font-mono text-sm">Loading…</p>}
      {error && <p className="text-status-down font-mono text-sm">{error}</p>}

      {!loading && !error && (
        <>
          {billingStatus && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-ink-900 border border-ink-700 rounded p-5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm border border-mist-400 mb-3" />
                <p className="text-[10.5px] uppercase tracking-wider text-mist-400 font-semibold mb-1">Account status</p>
                <p className="font-mono text-2xl font-semibold text-mist-50 capitalize">
                  {billingStatus.billing_account?.status}
                </p>
              </div>
              <div className="bg-ink-900 border border-ink-700 rounded p-5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm border border-signal mb-3" />
                <p className="text-[10.5px] uppercase tracking-wider text-mist-400 font-semibold mb-1">Outstanding balance</p>
                <p className="font-mono text-2xl font-semibold text-signal">
                  KSh {Number(billingStatus.outstanding_balance).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <div className="bg-ink-900 border border-ink-700 rounded overflow-hidden">
            <CardHead>
              <h2 className="font-display text-mist-50 font-medium text-sm pb-3">Invoices</h2>
            </CardHead>
            <table className="w-full text-sm border-t border-ink-700">
              <thead>
                <tr className="border-b border-ink-700 text-left">
                  <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide">Period</th>
                  <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide text-right">Devices</th>
                  <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide text-right">Amount</th>
                  <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-mist-400">
                      No invoices yet.
                    </td>
                  </tr>
                )}
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-5 py-3 text-mist-200 font-mono text-xs">
                      {new Date(inv.period_start).toLocaleDateString()} → {new Date(inv.period_end).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-mist-200 capitalize">{inv.type}</td>
                    <td className="px-5 py-3 text-mist-200 font-mono text-right">{inv.device_count}</td>
                    <td className="px-5 py-3 text-mist-50 font-mono text-right">
                      KSh {Number(inv.amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
