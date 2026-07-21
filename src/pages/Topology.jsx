import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { nocApi } from '../lib/api';

const STATUS_COLORS = {
  up: '#34D399',
  down: '#FB7185',
  unknown: '#8B9CB0',
};

function layoutDevices(devices, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 60;

  return devices.map((device, i) => {
    const angle = (2 * Math.PI * i) / Math.max(devices.length, 1) - Math.PI / 2;
    return {
      ...device,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
}

export default function Topology() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ device_a_id: '', device_b_id: '', link_type: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    nocApi
      .topology()
      .then((res) => {
        setDevices(res.data.devices || []);
        setLinks(res.data.links || []);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Could not load topology.');
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await nocApi.createTopologyLink(formData);
      setFormData({ device_a_id: '', device_b_id: '', link_type: '', description: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create link.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteLink(id) {
    try {
      await nocApi.deleteTopologyLink(id);
      load();
    } catch {
      setError('Could not delete link.');
    }
  }

  const width = 700;
  const height = 500;
  const positioned = layoutDevices(devices, width, height);
  const positionById = Object.fromEntries(positioned.map((d) => [d.id, d]));

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-mist-50 font-semibold">Topology</h1>
          <p className="text-mist-400 text-sm">Declared network connections with live device status</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-signal hover:bg-signal-dim text-ink-950 font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Link'}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded border border-status-down/30 bg-status-down/10 text-status-down text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-ink-900 border border-ink-700 rounded-lg p-5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="link-device-a" className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">Device A</label>
              <select
                id="link-device-a"
                required
                value={formData.device_a_id}
                onChange={(e) => setFormData({ ...formData, device_a_id: e.target.value })}
                className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2 text-mist-50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
              >
                <option value="">Select device…</option>
                {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="link-device-b" className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">Device B</label>
              <select
                id="link-device-b"
                required
                value={formData.device_b_id}
                onChange={(e) => setFormData({ ...formData, device_b_id: e.target.value })}
                className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2 text-mist-50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
              >
                <option value="">Select device…</option>
                {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="link-type" className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">Link type</label>
              <input
                id="link-type"
                type="text"
                placeholder="fiber, ethernet, wireless…"
                value={formData.link_type}
                onChange={(e) => setFormData({ ...formData, link_type: e.target.value })}
                className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2 text-mist-50 placeholder-mist-400/50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
              />
            </div>
            <div>
              <label htmlFor="link-description" className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">Description</label>
              <input
                id="link-description"
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2 text-mist-50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-signal hover:bg-signal-dim disabled:opacity-50 text-ink-950 font-semibold rounded px-4 py-2 text-sm transition-colors"
          >
            {submitting ? 'Saving…' : 'Create Link'}
          </button>
        </form>
      )}

      {loading && <p className="text-mist-400 font-mono text-sm">Loading…</p>}

      {!loading && (
        <div className="bg-ink-900 border border-ink-700 rounded-lg p-5">
          {devices.length === 0 ? (
            <p className="text-mist-400 text-sm text-center py-12">No devices to display.</p>
          ) : (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
              {links.map((link) => {
                const a = positionById[link.device_a_id];
                const b = positionById[link.device_b_id];
                if (!a || !b) return null;
                return (
                  <g key={link.id}>
                    <line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke="#2A3F58" strokeWidth={2}
                    />
                    <text
                      x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6}
                      fill="#8B9CB0" fontSize={10} fontFamily="monospace" textAnchor="middle"
                    >
                      {link.link_type || ''}
                    </text>
                  </g>
                );
              })}
              {positioned.map((d) => (
                <g key={d.id}>
                  <circle
                    cx={d.x} cy={d.y} r={22}
                    fill="#101A2E"
                    stroke={STATUS_COLORS[d.status] || STATUS_COLORS.unknown}
                    strokeWidth={3}
                  />
                  <circle cx={d.x} cy={d.y} r={5} fill={STATUS_COLORS[d.status] || STATUS_COLORS.unknown} />
                  <text
                    x={d.x} y={d.y + 40}
                    fill="#F2F5F8" fontSize={12} fontFamily="'Inter', sans-serif" fontWeight={500} textAnchor="middle"
                  >
                    {d.name}
                  </text>
                  <text
                    x={d.x} y={d.y + 55}
                    fill="#8B9CB0" fontSize={10} fontFamily="monospace" textAnchor="middle"
                  >
                    {d.ip_address}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>
      )}

      {!loading && links.length > 0 && (
        <div className="mt-4 bg-ink-900 border border-ink-700 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-ink-700">
            <h2 className="font-display text-mist-50 font-medium text-sm">Declared links</h2>
          </div>
          <div className="divide-y divide-ink-700">
            {links.map((link) => {
              const a = devices.find((d) => d.id === link.device_a_id);
              const b = devices.find((d) => d.id === link.device_b_id);
              return (
                <div key={link.id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-mist-200 text-sm">
                    {a?.name || '—'} <span className="text-mist-400">↔</span> {b?.name || '—'}
                    {link.link_type && <span className="text-mist-400 font-mono text-xs ml-2">({link.link_type})</span>}
                  </span>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="text-status-down hover:text-status-down/80 text-xs transition-colors"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Layout>
  );
}
