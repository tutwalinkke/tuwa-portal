import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { nocApi } from '../lib/api';

export default function Subnets() {
  const [subnets, setSubnets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    nocApi
      .subnets()
      .then((res) => setSubnets(res.data.subnets || []))
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Could not load subnets.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-mist-50 font-semibold">Subnets</h1>
        <p className="text-mist-400 text-sm">{subnets.length} subnet(s)</p>
      </div>

      {loading && <p className="text-mist-400 font-mono text-sm">Loading…</p>}
      {error && <p className="text-status-down font-mono text-sm">{error}</p>}

      {!loading && !error && (
        <div className="bg-ink-900 border border-ink-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left">
                <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide">CIDR</th>
                <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide">Description</th>
                <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide">Site</th>
                <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide text-right">Allocated</th>
                <th className="px-5 py-3 text-mist-400 font-medium text-xs uppercase tracking-wide text-right">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {subnets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-mist-400">
                    No subnets yet.
                  </td>
                </tr>
              )}
              {subnets.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 text-mist-50 font-mono">{s.cidr}</td>
                  <td className="px-5 py-3 text-mist-200">{s.description || '—'}</td>
                  <td className="px-5 py-3 text-mist-200">{s.site || '—'}</td>
                  <td className="px-5 py-3 text-status-warn font-mono text-right">{s.allocated_count}</td>
                  <td className="px-5 py-3 text-status-up font-mono text-right">{s.available_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
