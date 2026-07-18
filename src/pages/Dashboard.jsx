import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { nocApi } from '../lib/api';

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-ink-900 border border-ink-800 rounded-lg p-5">
      <p className="text-xs uppercase tracking-wide text-mist-400 mb-2">{label}</p>
      <p className={`font-mono text-3xl font-medium ${accent || 'text-mist-50'}`}>{value}</p>
    </div>
  );
}

function StatusDot({ status }) {
  const colorMap = {
    up: 'bg-status-up',
    down: 'bg-status-down',
    unknown: 'bg-mist-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colorMap[status] || colorMap.unknown}`} />;
}

function PulseHeartbeat({ percent }) {
  const amp = Math.max(4, (percent || 0) / 100 * 22);
  return (
    <svg viewBox="0 0 200 40" className="w-24 h-8">
      <path
        d={`M0,20 L60,20 L70,${20 - amp} L80,${20 + amp} L90,20 L200,20`}
        fill="none"
        stroke="#F5A623"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([nocApi.dashboard(), nocApi.billingStatus().catch(() => null)])
      .then(([dashRes, billingRes]) => {
        setData(dashRes.data);
        if (billingRes) setBilling(billingRes.data);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Could not load dashboard data.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <Layout>
        <p className="text-mist-400 font-mono text-sm">Loading…</p>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <p className="text-status-down font-mono text-sm">{error}</p>
      </Layout>
    );
  }

  const summary = data?.summary || {};
  const devices = data?.devices || [];
  const events = data?.recent_events || [];

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-mist-50 font-semibold">Network health</h1>
          <p className="text-mist-400 text-sm">{devices.length} device(s) monitored</p>
        </div>
        <PulseHeartbeat percent={summary.health_percent} />
      </div>

      {billing?.billing_account?.status === 'blocked' && (
        <div className="mb-6 px-4 py-3 rounded border border-status-down/30 bg-status-down/10 text-status-down text-sm">
          Account blocked — outstanding balance: KSh {billing.outstanding_balance}. Monitoring is paused until payment is recorded.
        </div>
      )}

      {billing?.billing_account?.status === 'trial' && (
        <div className="mb-6 px-4 py-3 rounded border border-signal/30 bg-signal/10 text-signal text-sm">
          Trial period — ends {new Date(billing.billing_account.trial_ends_at).toLocaleDateString()}.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Health" value={`${summary.health_percent ?? '—'}%`} accent="text-signal" />
        <StatCard label="Up" value={summary.devices_up ?? 0} accent="text-status-up" />
        <StatCard label="Down" value={summary.devices_down ?? 0} accent="text-status-down" />
        <StatCard label="Total" value={summary.devices_total ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-ink-900 border border-ink-800 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-ink-800">
            <h2 className="font-display text-mist-50 font-medium">Devices</h2>
          </div>
          <div className="divide-y divide-ink-800">
            {devices.length === 0 && (
              <p className="px-5 py-6 text-mist-400 text-sm">No devices yet.</p>
            )}
            {devices.map((d) => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusDot status={d.status} />
                  <div>
                    <p className="text-mist-50 text-sm font-medium">{d.name}</p>
                    <p className="text-mist-400 text-xs font-mono">{d.ip_address}</p>
                  </div>
                </div>
                <span className="text-mist-400 text-xs font-mono uppercase">{d.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-ink-900 border border-ink-800 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-ink-800">
            <h2 className="font-display text-mist-50 font-medium">Recent events</h2>
          </div>
          <div className="divide-y divide-ink-800 max-h-96 overflow-y-auto">
            {events.length === 0 && (
              <p className="px-5 py-6 text-mist-400 text-sm">No events yet.</p>
            )}
            {events.map((e) => (
              <div key={e.id} className="px-5 py-3">
                <p className={`text-xs font-mono uppercase mb-1 ${e.severity === 'critical' ? 'text-status-down' : 'text-mist-400'}`}>
                  {e.severity}
                </p>
                <p className="text-mist-200 text-sm">{e.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
