import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { identityApi, nocApi } from '../lib/api';

function SourceBadge({ source }) {
  const styles = {
    Identity: 'text-signal bg-signal/10 border-signal/30',
    NOC: 'text-mist-200 bg-ink-800 border-ink-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono uppercase border ${styles[source]}`}>
      {source}
    </span>
  );
}

export default function Activity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      identityApi.activity().catch(() => ({ data: { activities: [] } })),
      nocApi.activity().catch(() => ({ data: { activities: [] } })),
    ])
      .then(([identityRes, nocRes]) => {
        const identityEvents = (identityRes.data.activities || []).map((a) => ({
          id: `identity-${a.id}`,
          description: a.description,
          actorName: a.causer?.name,
          actorEmail: a.causer?.email,
          createdAt: a.created_at,
          source: 'Identity',
        }));

        const nocEvents = (nocRes.data.activities || []).map((a) => ({
          id: `noc-${a.id}`,
          description: a.description,
          actorName: a.actor_name,
          actorEmail: a.actor_email,
          createdAt: a.created_at,
          source: 'NOC',
        }));

        const merged = [...identityEvents, ...nocEvents].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        setActivities(merged);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Could not load activity log.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-mist-50 font-semibold">Activity Log</h1>
        <p className="text-mist-400 text-sm">Recent account and platform activity</p>
      </div>

      {loading && <p className="text-mist-400 font-mono text-sm">Loading…</p>}
      {error && <p className="text-status-down font-mono text-sm">{error}</p>}

      {!loading && !error && (
        <div className="bg-ink-900 border border-ink-700 rounded-lg overflow-hidden">
          <div className="divide-y divide-ink-700">
            {activities.length === 0 && (
              <p className="px-5 py-8 text-center text-mist-400">No activity recorded yet.</p>
            )}
            {activities.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SourceBadge source={a.source} />
                  <div>
                    <p className="text-mist-50 text-sm">{a.description}</p>
                    <p className="text-mist-400 text-xs font-mono">
                      {a.actorName ? `${a.actorName} (${a.actorEmail})` : 'System'}
                    </p>
                  </div>
                </div>
                <span className="text-mist-400 text-xs font-mono">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
