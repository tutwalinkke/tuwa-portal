import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { nocApi } from '../lib/api';

function StatusBadge({ status }) {
  const styles = {
    open: 'text-status-down bg-status-down/10 border-status-down/30',
    acknowledged: 'text-signal bg-signal/10 border-signal/30',
    resolved: 'text-status-up bg-status-up/10 border-status-up/30',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono uppercase border ${styles[status] || ''}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const styles = {
    critical: 'text-status-down bg-status-down/10 border-status-down/30',
    warning: 'text-signal bg-signal/10 border-signal/30',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono uppercase border ${styles[severity] || ''}`}>
      {severity}
    </span>
  );
}

const TABS = [
  { key: '', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'resolved', label: 'Resolved' },
];

export default function Incidents() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('open');
  const [actioningId, setActioningId] = useState(null);

  function load(status) {
    setLoading(true);
    nocApi
      .incidents(status || undefined)
      .then((res) => setIncidents(res.data.incidents || []))
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Could not load incidents.');
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(activeTab);
  }, [activeTab, navigate]);

  async function handleAcknowledge(id) {
    setActioningId(id);
    try {
      await nocApi.acknowledgeIncident(id);
      load(activeTab);
    } catch {
      setError('Could not acknowledge incident.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleResolve(id) {
    setActioningId(id);
    try {
      await nocApi.resolveIncident(id);
      load(activeTab);
    } catch {
      setError('Could not resolve incident.');
    } finally {
      setActioningId(null);
    }
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-mist-50 font-semibold">Incidents</h1>
        <p className="text-mist-400 text-sm">Tracked events from device outages and bandwidth threshold breaches</p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-ink-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-signal text-mist-50'
                : 'border-transparent text-mist-400 hover:text-mist-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="text-status-down font-mono text-sm mb-4">{error}</p>}
      {loading && <p className="text-mist-400 font-mono text-sm">Loading…</p>}

      {!loading && (
        <div className="bg-ink-900 border border-ink-700 rounded-lg overflow-hidden">
          <div className="divide-y divide-ink-700">
            {incidents.length === 0 && (
              <p className="px-5 py-8 text-center text-mist-400">No incidents{activeTab ? ` (${activeTab})` : ''}.</p>
            )}
            {incidents.map((incident) => (
              <div key={incident.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={incident.status} />
                    {incident.device_event && <SeverityBadge severity={incident.device_event.severity} />}
                    <span className="text-mist-50 text-sm font-medium">{incident.device?.name}</span>
                  </div>
                  <p className="text-mist-200 text-sm truncate">{incident.device_event?.message}</p>
                  <p className="text-mist-400 text-xs font-mono mt-1">
                    Opened {new Date(incident.created_at).toLocaleString()}
                    {incident.acknowledged_at && ` · Acknowledged ${new Date(incident.acknowledged_at).toLocaleString()}`}
                    {incident.escalated_at && ' · Escalated'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {incident.status === 'open' && (
                    <button
                      onClick={() => handleAcknowledge(incident.id)}
                      disabled={actioningId === incident.id}
                      className="bg-signal hover:bg-signal-dim disabled:opacity-50 text-ink-950 font-semibold rounded px-3 py-1.5 text-xs transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {incident.status !== 'resolved' && (
                    <button
                      onClick={() => handleResolve(incident.id)}
                      disabled={actioningId === incident.id}
                      className="border border-ink-700 hover:border-status-up text-mist-200 hover:text-status-up disabled:opacity-50 rounded px-3 py-1.5 text-xs transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
