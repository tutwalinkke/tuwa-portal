import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { nocApi } from '../lib/api';

const STATUS_STYLES = {
  up: 'text-status-up bg-status-up/10 border-status-up/30',
  down: 'text-status-down bg-status-down/10 border-status-down/30',
  unknown: 'text-mist-400 bg-ink-800 border-ink-700',
};

const DEVICE_TYPES = [
  { value: 'router', label: 'Router' },
  { value: 'switch', label: 'Switch' },
  { value: 'olt', label: 'OLT' },
  { value: 'access_point', label: 'Access Point' },
  { value: 'server', label: 'Server' },
  { value: 'ups', label: 'UPS' },
  { value: 'other', label: 'Other' },
];

function StatusBadge({ status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono uppercase border ${STATUS_STYLES[status] || STATUS_STYLES.unknown}`}>
      {status}
    </span>
  );
}

export default function Devices() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProvisionPanel, setShowProvisionPanel] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionedCode, setProvisionedCode] = useState(null);
  const [deviceType, setDeviceType] = useState('router');
  const [deviceName, setDeviceName] = useState('');

  function load() {
    setLoading(true);
    nocApi
      .devices()
      .then((res) => setDevices(res.data.devices || []))
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Could not load devices.');
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [navigate]);

  async function handleGenerateCode(e) {
    e.preventDefault();
    setProvisioning(true);
    setError('');
    try {
      const res = await nocApi.createProvisioningCode(deviceType, deviceName || undefined);
      setProvisionedCode(res.data);
    } catch (err) {
      setError('Could not generate a provisioning code.');
    } finally {
      setProvisioning(false);
    }
  }

  function closeProvisionPanel() {
    setShowProvisionPanel(false);
    setProvisionedCode(null);
    setDeviceType('router');
    setDeviceName('');
    load();
  }

  // NOTE: RouterOS does not support bash-style $(...) command
  // substitution — an earlier version of this command wrongly mixed
  // that in, which would have failed if actually pasted into a
  // router. Correct RouterOS scripting requires storing the public
  // key in a :local variable first, then building the fetch call
  // separately. Full one-paste automation is still a planned next
  // step, not something to fake as already working.
  const setupCommand = `/interface/wireguard/add name=wg0 listen-port=13231\n:local pubkey [/interface/wireguard/get wg0 public-key]\n:put $pubkey`;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-mist-50 font-semibold">Devices</h1>
          <p className="text-mist-400 text-sm">Every device on your network, monitored via SNMP over a WireGuard tunnel</p>
        </div>
        <button
          onClick={() => setShowProvisionPanel(true)}
          className="bg-signal hover:bg-signal-dim text-ink-950 font-semibold rounded px-4 py-2 text-sm transition-colors"
        >
          + Add Device
        </button>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded border border-status-down/30 bg-status-down/10 text-status-down text-sm">
          {error}
        </div>
      )}

      {showProvisionPanel && (
        <div className="bg-ink-900 border border-ink-700 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-mist-50 font-medium">Add a device</h2>
            <button onClick={closeProvisionPanel} className="text-mist-400 hover:text-mist-50 text-sm">Close</button>
          </div>

          {!provisionedCode && (
            <form onSubmit={handleGenerateCode}>
              <p className="text-mist-300 text-sm mb-4">
                Choose the device type and (optionally) a name, then generate a one-time provisioning
                code. It's valid for 15 minutes and can only be used once.
              </p>

              <div className="mb-4">
                <label htmlFor="device-type" className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">Device type</label>
                <select
                  id="device-type"
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2 text-mist-50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
                >
                  {DEVICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-5">
                <label htmlFor="device-name" className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">Device name (optional)</label>
                <input
                  id="device-name"
                  type="text"
                  placeholder="e.g. Kilimani Tower Router"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2 text-mist-50 placeholder-mist-400/50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
                />
              </div>

              <button
                type="submit"
                disabled={provisioning}
                className="bg-signal hover:bg-signal-dim disabled:opacity-50 text-ink-950 font-semibold rounded px-4 py-2 text-sm transition-colors"
              >
                {provisioning ? 'Generating…' : 'Generate Code'}
              </button>
            </form>
          )}

          {provisionedCode && (
            <div>
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wide text-mist-400 mb-1.5">Your provisioning code</p>
                <div className="bg-ink-950 border border-ink-700 rounded px-4 py-3 font-mono text-signal text-sm break-all">
                  {provisionedCode.code}
                </div>
                <p className="text-mist-400 text-xs mt-1.5">
                  Expires at {new Date(provisionedCode.expires_at).toLocaleTimeString()} — one use only.
                  {deviceName && ` Will be added as "${deviceName}".`}
                </p>
              </div>

              <div className="mb-4 px-3 py-2 rounded border border-signal/30 bg-signal/10 text-mist-200 text-xs leading-relaxed">
                A fully automated one-paste command isn't built yet — this is a two-step manual process
                for now. Full automation is a planned next step, not something we're pretending already works.
              </div>

              <div className="mb-4">
                <p className="text-xs uppercase tracking-wide text-mist-400 mb-1.5">Step 1 — run on the router (RouterOS terminal)</p>
                <pre className="bg-ink-950 border border-ink-700 rounded px-4 py-3 font-mono text-mist-200 text-xs overflow-x-auto whitespace-pre-wrap break-all">
{setupCommand}
                </pre>
                <p className="text-mist-400 text-xs mt-1.5">This prints the router's WireGuard public key — copy it.</p>
              </div>

              <div className="mb-4">
                <p className="text-xs uppercase tracking-wide text-mist-400 mb-1.5">Step 2 — redeem the code (from any machine with network access)</p>
                <pre className="bg-ink-950 border border-ink-700 rounded px-4 py-3 font-mono text-mist-200 text-xs overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST https://noc.tuwalink.com/api/v1/provisioning-codes/redeem \\
  -H "Content-Type: application/json" \\
  -d '{"code":"${provisionedCode.code}","wireguard_public_key":"<paste the public key from step 1>"}'`}
                </pre>
                <p className="text-mist-400 text-xs mt-1.5">
                  The response is JSON with three fields you'll need for step 3: assigned_ip, server_public_key, server_endpoint.
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-mist-400 mb-1.5">Step 3 — back on the router, complete the tunnel</p>
                <pre className="bg-ink-950 border border-ink-700 rounded px-4 py-3 font-mono text-mist-200 text-xs overflow-x-auto whitespace-pre-wrap break-all">
{`/ip/address/add address=<assigned_ip>/24 interface=wg0
/interface/wireguard/peers/add interface=wg0 public-key="<server_public_key>" endpoint-address=<host from server_endpoint> endpoint-port=<port from server_endpoint> allowed-address=10.20.0.1/32 persistent-keepalive=25s`}
                </pre>
                <p className="text-mist-400 text-xs mt-1.5">
                  server_endpoint is host:port together (e.g. 129.121.102.51:51821) — split it into the two separate fields RouterOS expects.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && <p className="text-mist-400 font-mono text-sm">Loading…</p>}

      {!loading && (
        <div className="bg-ink-900 border border-ink-700 rounded-lg overflow-hidden">
          <div className="divide-y divide-ink-700">
            {devices.length === 0 && (
              <p className="px-5 py-8 text-center text-mist-400">No devices yet. Add one to get started.</p>
            )}
            {devices.map((device) => (
              <div key={device.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={device.status} />
                    <span className="text-mist-50 text-sm font-medium">{device.name}</span>
                    <span className="text-mist-400 text-xs uppercase font-mono">{device.type}</span>
                  </div>
                  <p className="text-mist-400 text-xs font-mono">
                    {device.ip_address}
                    {device.wireguard_ip && ` · WireGuard: ${device.wireguard_ip}`}
                    {device.site && ` · ${device.site}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
