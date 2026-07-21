import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PulseLine() {
  return (
    <svg viewBox="0 0 400 60" className="w-full h-12 opacity-40" preserveAspectRatio="none">
      <path
        d="M0,30 L60,30 L75,10 L90,50 L105,30 L400,30"
        fill="none"
        stroke="#F5A623"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingToken, setPendingToken] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.requiresTwoFactor) {
        setPendingToken(result.pendingToken);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Incorrect email or password.'
          : 'Something went wrong. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCodeSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await verifyTwoFactor(pendingToken, code);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Invalid code. Please try again.'
          : 'Something went wrong. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-signal" />
            <span className="font-display text-mist-50 text-xl font-semibold tracking-tight">
              Tuwa
            </span>
            <span className="font-mono text-mist-400 text-xs uppercase tracking-widest">
              NOC
            </span>
          </div>
          <PulseLine />
        </div>

        <div className="bg-ink-900 border border-ink-700 rounded-lg p-8">
          {!pendingToken ? (
            <>
              <h1 className="font-display text-2xl text-mist-50 font-semibold mb-1">
                Sign in
              </h1>
              <p className="text-mist-400 text-sm mb-6">
                Access your network operations workspace.
              </p>

              {error && (
                <div className="mb-4 px-3 py-2 rounded border border-status-down/30 bg-status-down/10 text-status-down text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2.5 text-mist-50 placeholder-mist-400/50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2.5 text-mist-50 placeholder-mist-400/50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
                    placeholder="Enter password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-signal hover:bg-signal-dim disabled:opacity-50 text-ink-950 font-semibold rounded px-4 py-2.5 transition-colors"
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl text-mist-50 font-semibold mb-1">
                Two-factor verification
              </h1>
              <p className="text-mist-400 text-sm mb-6">
                Enter the 6-digit code from your authenticator app, or a recovery code.
              </p>

              {error && (
                <div className="mb-4 px-3 py-2 rounded border border-status-down/30 bg-status-down/10 text-status-down text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-mist-400 mb-1.5">
                    Code
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-ink-800 border border-ink-700 rounded px-3 py-2.5 text-mist-50 font-mono text-lg tracking-widest text-center placeholder-mist-400/50 focus:outline-none focus:ring-2 focus:ring-signal/50 focus:border-signal"
                    placeholder="000000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-signal hover:bg-signal-dim disabled:opacity-50 text-ink-950 font-semibold rounded px-4 py-2.5 transition-colors"
                >
                  {submitting ? 'Verifying…' : 'Verify'}
                </button>

                <button
                  type="button"
                  onClick={() => { setPendingToken(null); setCode(''); setError(''); }}
                  className="w-full text-mist-400 hover:text-mist-50 text-sm transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-mist-400/60 text-xs mt-6 font-mono">
          Tuwa NOC · Encrypted connection
        </p>
      </div>
    </div>
  );
}
