import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Layout from '../components/Layout';
import { identityApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [enabled, setEnabled] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Setup flow state
  const [setupData, setSetupData] = useState(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState(null);

  // Disable flow state
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    identityApi
      .twoFactorStatus()
      .then((res) => setEnabled(res.data.enabled))
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Could not load two-factor status.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  async function handleBeginSetup() {
    setError('');
    try {
      const res = await identityApi.twoFactorSetup();
      setSetupData(res.data);
    } catch {
      setError('Could not begin two-factor setup.');
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setError('');
    setConfirming(true);
    try {
      const res = await identityApi.twoFactorConfirm(confirmCode);
      setRecoveryCodes(res.data.recovery_codes);
      setEnabled(true);
      setSetupData(null);
      setConfirmCode('');
    } catch (err) {
      setError(err.response?.status === 422 ? 'Invalid code. Please try again.' : 'Something went wrong.');
    } finally {
      setConfirming(false);
    }
  }

  async function handleDisable(e) {
    e.preventDefault();
    setError('');
    setDisabling(true);
    try {
      await identityApi.twoFactorDisable(disablePassword);
      setEnabled(false);
      setShowDisableForm(false);
      setDisablePassword('');
      setRecoveryCodes(null);
    } catch (err) {
      setError(err.response?.status === 401 ? 'Incorrect password.' : 'Something went wrong.');
    } finally {
      setDisabling(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-mist-400 font-mono text-sm">Loading…</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-mist-50 font-semibold">Settings</h1>
        <p className="text-mist-400 text-sm">{user?.email}</p>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded border border-status-down/30 bg-status-down/10 text-status-down text-sm">
          {error}
        </div>
      )}

      {recoveryCodes && (
        <div className="mb-6 bg-ink-900 border border-signal/30 rounded-lg p-5">
          <h2 className="font-display text-mist-50 font-medium mb-2">Save your recovery codes</h2>
          <p className="text-mist-400 text-sm mb-4">
            Each code works once, if you lose access to your authenticator app. Store these somewhere safe — they will not be shown again.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {recoveryCodes.map((rc) => (
              <span key={rc} className="font-mono text-mist-50 bg-ink-800 rounded px-3 py-2 text-center text-sm">
                {rc}
              </span>
            ))}
          </div>
          <button
            onClick={() => setRecoveryCodes(null)}
            className="bg-signal hover:bg-signal-dim text-ink-950 font-semibold rounded px-4 py-2 text-sm transition-colors"
          >
            I've saved these codes
          </button>
        </div>
      )}

      <div className="bg-ink-900 border border-ink-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-mist-50 font-medium">Two-factor authentication</h2>
          {enabled !== null && (
            <span className={`text-xs font-mono uppercase px-2 py-0.5 rounded border ${
              enabled
                ? 'text-status-up bg-status-up/10 border-status-up/30'
                : 'text-mist-400 bg-ink-800 border-ink-700'
            }`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          )}
        </div>
        <p className="text-mist-400 text-sm mb-4">
          Require a code from an authenticator app in addition to your password when signing in.
        </p>

        {!enabled && !setupData && (
          <button
            onClick={handleBeginSetup}
            className="bg-signal hover:bg-signal-dim text-ink-950 font-semibold rounded px-4 py-2 text-sm transition-colors"
          >
            Enable two-factor authentication
          </button>
        )}

        {setupData && (
          <div className="mt-4 pt-4 border-t border-ink-700">
            <p className="text-mist-200 text-sm mb-4">
              Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the code it generates.
            </p>
            <div className="bg-white p-4 rounded-lg inline-block mb-4">
              <QRCodeSVG value={setupData.qr_code_url} size={180} />
            </div>
            <p className="text-mist-400 text-xs font-mono mb-4">
              Can't scan? Enter this key manually: <span className="text-mist-200">{setupData.secret}</span>
            </p>

            <form onSubmit={handleConfirm} className="flex items-end gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">
                  Verification code
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  className="bg-ink-800 border border-ink-700 rounded px-3 py-2 text-mist-50 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={confirming}
                className="bg-signal hover:bg-signal-dim disabled:opacity-50 text-ink-950 font-semibold rounded px-4 py-2 text-sm transition-colors"
              >
                {confirming ? 'Confirming…' : 'Confirm'}
              </button>
            </form>
          </div>
        )}

        {enabled && !showDisableForm && (
          <button
            onClick={() => setShowDisableForm(true)}
            className="text-status-down hover:text-status-down/80 text-sm font-medium transition-colors"
          >
            Disable two-factor authentication
          </button>
        )}

        {showDisableForm && (
          <form onSubmit={handleDisable} className="mt-4 pt-4 border-t border-ink-700 flex items-end gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">
                Confirm your password
              </label>
              <input
                type="password"
                required
                autoFocus
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="bg-ink-800 border border-ink-700 rounded px-3 py-2 text-mist-50 focus:outline-none focus:ring-2 focus:ring-status-down/50 focus:border-status-down"
              />
            </div>
            <button
              type="submit"
              disabled={disabling}
              className="bg-status-down hover:bg-status-down/80 disabled:opacity-50 text-ink-950 font-semibold rounded px-4 py-2 text-sm transition-colors"
            >
              {disabling ? 'Disabling…' : 'Disable'}
            </button>
            <button
              type="button"
              onClick={() => { setShowDisableForm(false); setDisablePassword(''); }}
              className="text-mist-400 hover:text-mist-50 text-sm transition-colors"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
