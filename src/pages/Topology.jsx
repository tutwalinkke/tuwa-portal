import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { nocApi } from '../lib/api';

const STATUS_COLORS = {
  up: '#34D399',
  down: '#FB7185',
  unknown: '#8B9CB0',
};

// Tiering is derived from the real device `type` field we already
// store — not a fabricated hierarchy. Matches common WISP topology
// conventions (core router -> distribution switch -> access/edge).
// Devices of a type with no tier mapping fall into the last tier
// rather than being silently dropped.
const TYPE_TIER = {
  router: 0,
  switch: 1,
  olt: 2,
  access_point: 2,
  server: 3,
  ups: 3,
  other: 3,
};

const TYPE_ABBR = {
  router: 'RTR',
  switch: 'SW',
  olt: 'OLT',
  access_point: 'AP',
  server: 'SRV',
  ups: 'UPS',
  other: '?',
};

const TIER_LABELS = ['Core', 'Distribution', 'Access', 'Other'];

function layoutDevices(devices, width) {
  const tierGroups = {};
  devices.forEach((d) => {
    const tier = TYPE_TIER[d.type] ?? 3;
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(d);
  });

  const presentTiers = Object.keys(tierGroups).map(Number).sort((a, b) => a - b);
  const rowHeight = 150;
  const topPadding = 70;
  const height = topPadding + presentTiers.length * rowHeight + 40;

  const positioned = [];
  presentTiers.forEach((tier, rowIndex) => {
    const group = tierGroups[tier];
    const y = topPadding + rowIndex * rowHeight;
    const spacing = width / (group.length + 1);
    group.forEach((d, i) => {
      positioned.push({ ...d, x: spacing * (i + 1), y, tier });
    });
  });

  return { positioned, height, presentTiers };
}

function StatusPulseNode({ d, isSelected, onClick }) {
  const color = STATUS_COLORS[d.status] || STATUS_COLORS.unknown;
  return (
    <g style={{ cursor: 'pointer' }} onClick={() => onClick(d)}>
      {d.status === 'up' && (
        <circle cx={d.x} cy={d.y} r={22} fill="none" stroke={color} strokeWidth={1} opacity={0.5}>
          <animate attributeName="r" values="22;32;22" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}
      <circle
        cx={d.x} cy={d.y} r={22}
        fill="#101A2E"
        stroke={isSelected ? '#F5A623' : color}
        strokeWidth={isSelected ? 3.5 : 2.5}
      />
      <text
        x={d.x} y={d.y + 4}
        fill={color} fontSize={9} fontFamily="monospace" fontWeight={700} textAnchor="middle"
      >
        {TYPE_ABBR[d.type] || '?'}
      </text>
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
  );
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
  const [selectedDevice, setSelectedDevice] = useState(null);

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

  const width = 800;
  const { positioned, height, presentTiers } = layoutDevices(devices, width);
  const positionById = Object.fromEntries(positioned.map((d) => [d.id, d]));

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-mist-50 font-semibold">Topology</h1>
          <p className="text-mist-400 text-sm">Declared network connections with live device status — tiered by device type</p>
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
            <div className="relative">
              {/* Tier labels down the left edge — real, derived from actual device types present */}
              <div className="absolute left-0 top-0 flex flex-col text-xs font-mono uppercase text-mist-400" style={{ height: `${height}px` }}>
                {presentTiers.map((tier, i) => (
                  <div
                    key={tier}
                    className="absolute"
                    style={{ top: `${(70 + i * 150) / height * 100}%`, transform: 'translateY(-50%)' }}
                  >
                    {TIER_LABELS[tier] || 'Other'}
                  </div>
                ))}
              </div>
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {links.map((link) => {
                  const a = positionById[link.device_a_id];
                  const b = positionById[link.device_b_id];
                  if (!a || !b) return null;

                  // A link spanning more than one tier gap (e.g. Core
                  // straight to Access, skipping Distribution) would
                  // otherwise draw a straight line directly through
                  // whatever real device happens to sit in a tier in
                  // between — visually implying a connection to it
                  // that was never declared. Curve those specific
                  // links outward instead of drawing them straight.
                  const tierGap = Math.abs(a.tier - b.tier);
                  const isMultiTierSpan = tierGap > 1;
                  const midX = (a.x + b.x) / 2;
                  const midY = (a.y + b.y) / 2;
                  const bowX = isMultiTierSpan ? midX + 90 : midX;

                  const path = isMultiTierSpan
                    ? `M ${a.x} ${a.y} Q ${bowX} ${midY} ${b.x} ${b.y}`
                    : `M ${a.x} ${a.y} L ${b.x} ${b.y}`;

                  return (
                    <g key={link.id}>
                      <path d={path} stroke="#2A3F58" strokeWidth={2} fill="none" />
                      <text
                        x={isMultiTierSpan ? bowX : midX} y={midY - 6}
                        fill="#8B9CB0" fontSize={10} fontFamily="monospace" textAnchor="middle"
                      >
                        {link.link_type || ''}
                      </text>
                    </g>
                  );
                })}
                {positioned.map((d) => (
                  <StatusPulseNode
                    key={d.id}
                    d={d}
                    isSelected={selectedDevice?.id === d.id}
                    onClick={setSelectedDevice}
                  />
                ))}
              </svg>
            </div>
          )}
        </div>
      )}

      {selectedDevice && (
        <div className="mt-4 bg-ink-900 border border-signal/40 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-mist-50 font-medium">{selectedDevice.name}</h2>
            <button onClick={() => setSelectedDevice(null)} className="text-mist-400 hover:text-mist-50 text-sm">Close</button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-mist-400 text-xs uppercase block">Type</span>{selectedDevice.type}</div>
            <div><span className="text-mist-400 text-xs uppercase block">Status</span>{selectedDevice.status}</div>
            <div><span className="text-mist-400 text-xs uppercase block">IP Address</span><span className="font-mono">{selectedDevice.ip_address}</span></div>
            {selectedDevice.site && <div><span className="text-mist-400 text-xs uppercase block">Site</span>{selectedDevice.site}</div>}
          </div>
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
