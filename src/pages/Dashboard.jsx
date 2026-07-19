import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Layout from '../components/Layout';
import { nocApi } from '../lib/api';

function formatBps(bps) {
  if (bps === null || bps === undefined) return '—';
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
  return `${bps} bps`;
}

function HealthGauge({ percent }) {
  const value = percent ?? 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? '#34D399' : value >= 50 ? '#F59E0B' : '#FB7185';

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#182238" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-3xl font-medium text-mist-50">
          {percent !== null ? `${percent}%` : '—'}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-mist-400">Health</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-ink-900 border border-ink-700 rounded-lg p-4 flex flex-col justify-center h-full">
      <p className="text-[11px] uppercase tracking-wider text-mist-400 mb-1">{label}</p>
      <p className={`font-mono text-2xl font-medium ${accent || 'text-mist-50'}`}>{value}</p>
    </div>
  );
}

function StatusDot({ status }) {
  const colorMap = { up: 'bg-status-up', down: 'bg-status-down', unknown: 'bg-mist-400' };
  return <span className={`inline-block w-2 h-2 rounded-full ${colorMap[status] || colorMap.unknown}`} />;
}

function BandwidthChart({ data }) {
  const chartData = data.map((d) => ({
    time: new Date(d.polled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    in: d.in_bps,
    out: d.out_bps,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="inGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5A623" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#F5A623" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="outGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34D399" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#182238" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fill: '#8B9CB0', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: '#1B2740' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#8B9CB0', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatBps(v)}
          width={70}
        />
        <Tooltip
          contentStyle={{ background: '#101A2E', border: '1px solid #1B2740', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: '#8B9CB0' }}
          formatter={(value) => formatBps(value)}
        />
        <Area type="monotone" dataKey="in" stroke="#F5A623" strokeWidth={1.5} fill="url(#inGradient)" name="Inbound" />
        <Area type="monotone" dataKey="out" stroke="#34D399" strokeWidth={1.5} fill="url(#outGradient)" name="Outbound" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [bandwidth, setBandwidth] = useState([]);
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      nocApi.dashboard(),
      nocApi.bandwidthHistory().catch(() => ({ data: { history: [] } })),
      nocApi.billingStatus().catch(() => null),
    ])
      .then(([dashRes, bwRes, billingRes]) => {
        setData(dashRes.data);
        setBandwidth(bwRes.data.history || []);
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        <div className="lg:col-span-1 bg-ink-900 border border-ink-700 rounded-lg p-5 flex items-center justify-center">
          <HealthGauge percent={summary.health_percent} />
        </div>
        <div className="lg:col-span-3 grid grid-cols-3 gap-4">
          <StatCard label="Devices Up" value={summary.devices_up ?? 0} accent="text-status-up" />
          <StatCard label="Devices Down" value={summary.devices_down ?? 0} accent="text-status-down" />
          <StatCard label="Total Monitored" value={summary.devices_total ?? 0} />
          <StatCard label="Inbound" value={formatBps(summary.total_in_bps)} accent="text-signal" />
          <StatCard label="Outbound" value={formatBps(summary.total_out_bps)} accent="text-status-up" />
          <StatCard label="Critical Events" value={data?.event_summary?.critical ?? 0} accent="text-status-down" />
        </div>
      </div>

      <div className="bg-ink-900 border border-ink-700 rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-mist-50 font-medium">Bandwidth</h2>
          <span className="text-[11px] font-mono text-mist-400 uppercase tracking-wider">Live · Real SNMP data</span>
        </div>
        {bandwidth.length > 0 ? (
          <BandwidthChart data={bandwidth} />
        ) : (
          <p className="text-mist-400 text-sm py-8 text-center">No bandwidth history yet.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-ink-900 border border-ink-700 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-ink-700">
            <h2 className="font-display text-mist-50 font-medium">Devices</h2>
          </div>
          <div className="divide-y divide-ink-700">
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
                <div className="text-right">
                  <span className="text-mist-400 text-xs font-mono uppercase block">{d.status}</span>
                  {d.total_in_bps > 0 && (
                    <span className="text-signal text-[11px] font-mono">{formatBps(d.total_in_bps)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-ink-900 border border-ink-700 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-ink-700">
            <h2 className="font-display text-mist-50 font-medium">Recent events</h2>
          </div>
          <div className="divide-y divide-ink-700 max-h-96 overflow-y-auto">
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
