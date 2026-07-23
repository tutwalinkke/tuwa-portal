import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { nocApi } from '../lib/api';
import axios from 'axios';

const NOC_URL = 'https://noc.tuwalink.com/api/v1';

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

// Verified end-to-end against real MikroTik RouterOS hardware — every
// piece of this (interface creation, /tool fetch, JSON field
// extraction via string search, endpoint host:port splitting, tunnel
// completion) was tested individually and then as a whole against a
// real hEX S before being trusted here. Wrapped in :do/:on-error so a
// bad or expired code fails with a readable message instead of a raw
// RouterOS error.
function buildOnePasteCommand(code) {
  return `:do {
  :local code "${code}";
  :if ([:len [/interface/wireguard/find name=wg0]] > 0) do={
    :error "A WireGuard interface named wg0 already exists on this router. Remove or rename it first, then run this again.";
  };
  /interface/wireguard/add name=wg0 listen-port=13231;
  :local pubkey [/interface/wireguard/get wg0 public-key];
  :local result [/tool fetch url="https://noc.tuwalink.com/api/v1/provisioning-codes/redeem" http-method=post http-header-field="Content-Type: application/json" http-data="{\\"code\\":\\"$code\\",\\"wireguard_public_key\\":\\"$pubkey\\"}" as-value output=user];
  :local jsonData ($result->"data");
  :local extractField do={:local sf ("\\"" . $field . "\\":\\""); :local sp ([:find $data $sf] + [:len $sf]); :local ep [:find $data "\\"" $sp]; :return [:pick $data $sp $ep]};
  :local assignedIp [$extractField data=$jsonData field="assigned_ip"];
  :local serverKey [$extractField data=$jsonData field="server_public_key"];
  :local endpoint [$extractField data=$jsonData field="server_endpoint"];
  :local snmpCommunity [$extractField data=$jsonData field="snmp_community"];
  :local serverWgIp [$extractField data=$jsonData field="server_wireguard_ip"];
  :local colonPos [:find $endpoint ":"];
  :local endpointHost [:pick $endpoint 0 $colonPos];
  :local endpointPort [:pick $endpoint ($colonPos + 1) [:len $endpoint]];
  /ip/address/add address="$assignedIp/24" interface=wg0;
  /interface/wireguard/peers/add interface=wg0 public-key="$serverKey" endpoint-address=$endpointHost endpoint-port=$endpointPort allowed-address="$serverWgIp/32" persistent-keepalive=25s;
  /snmp/set enabled=yes;
  /snmp/community/set [find name=public] name="$snmpCommunity" addresses="$serverWgIp/32";
  :put "Connected successfully. Assigned IP: $assignedIp";
} on-error={
  /interface/wireguard/remove [find name=wg0];
  :put "Provisioning failed. This can happen if: the code is invalid, expired, or already used; the redemption request was rate-limited (too many attempts in a short window — wait a minute and try again with a fresh code); or there was a network issue reaching the server. Generate a new code and try again.";
}`;
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
  const [pollStatus, setPollStatus] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const pollIntervalRef = useRef(null);

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

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  function startPolling(code) {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${NOC_URL}/provisioning-codes/${code}/status`);
        setPollStatus(res.data.status);

        if (res.data.status === 'connected') {
          clearInterval(pollIntervalRef.current);
          setSuccessMessage(`"${res.data.device_name}" connected successfully.`);
          setTimeout(() => {
            setShowProvisionPanel(false);
            setProvisionedCode(null);
            setPollStatus(null);
            setDeviceType('router');
            setDeviceName('');
            load();
          }, 1800);
        }
      } catch {
        // A transient poll failure isn't worth surfacing — the next
        // poll a few seconds later will likely succeed.
      }
    }, 3000);
  }

  async function handleGenerateCode(e) {
    e.preventDefault();
    setProvisioning(true);
    setError('');
    try {
      const res = await nocApi.createProvisioningCode(deviceType, deviceName || undefined);
      setProvisionedCode(res.data);
      setPollStatus('waiting_for_redemption');
      startPolling(res.data.code);
    } catch (err) {
      setError('Could not generate a provisioning code.');
    } finally {
      setProvisioning(false);
    }
  }

  function closeProvisionPanel() {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setShowProvisionPanel(false);
    setProvisionedCode(null);
    setPollStatus(null);
    setDeviceType('router');
    setDeviceName('');
    load();
  }

  const POLL_LABELS = {
    waiting_for_redemption: 'Waiting for the code to be run on the router…',
    waiting_for_connection: 'Code accepted — waiting for the device to connect…',
    connected: 'Connected!',
  };

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

      {successMessage && (
        <div className="mb-4 px-3 py-2 rounded border border-status-up/30 bg-status-up/10 text-status-up text-sm">
          ✓ {successMessage}
        </div>
      )}

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

          {provisionedCode && pollStatus !== 'connected' && (
            <div>
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wide text-mist-400 mb-1.5">Run this once on the router (RouterOS terminal)</p>
                <pre className="bg-ink-950 border border-ink-700 rounded px-4 py-3 font-mono text-signal text-xs overflow-x-auto whitespace-pre-wrap break-all">
{buildOnePasteCommand(provisionedCode.code)}
                </pre>
                <p className="text-mist-400 text-xs mt-1.5">
                  Paste this once into a RouterOS terminal (WinBox or SSH) — everything else is automatic.
                  Expires at {new Date(provisionedCode.expires_at).toLocaleTimeString()}.
                  {deviceName && ` Will be added as "${deviceName}".`}
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded border border-signal/30 bg-signal/10 text-mist-200 text-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-signal animate-pulse" />
                {POLL_LABELS[pollStatus] || 'Waiting…'}
              </div>
            </div>
          )}

          {provisionedCode && pollStatus === 'connected' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded border border-status-up/30 bg-status-up/10 text-status-up text-sm">
              ✓ Connected!
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
