import React, { useEffect, useState } from 'react';
import { ActiveSession } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { formatDate, truncate } from '../lib/utils.js';
import { KeyRound, Trash2, RefreshCw, Clock, ShieldCheck } from 'lucide-react';

export function SessionsPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<{ sessions: ActiveSession[] }>('/admin/sessions');
      setSessions(data.sessions || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleInvalidate = async (sessionId: string) => {
    if (!window.confirm(`Are you sure you want to invalidate session ${sessionId}? All active tokens for this session will expire immediately.`)) {
      return;
    }
    try {
      await fetchApi(`/admin/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } catch {}
  };

  const filtered = sessions.filter((s) => s.sessionId.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Session Token Vault</h1>
          <p className="text-sm text-slate-400">Ephemeral active token sessions with automatic TTL expiry. Zero plaintext values exposed.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search by Session ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-48 sm:w-64"
          />
          <button
            onClick={loadSessions}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Refresh sessions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Security Assurance Banner */}
      <div className="p-4 bg-blue-950/20 border border-blue-900/30 rounded-xl flex items-center gap-3 text-xs text-blue-300">
        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
        <span>
          <strong>Zero-Knowledge Console:</strong> In accordance with strict security architecture, this console only displays ephemeral session IDs and token counts. Token values themselves never enter the UI.
        </span>
      </div>

      {/* Sessions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Session ID</th>
                <th className="px-6 py-4">Tokens Cached</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4">TTL Remaining</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length > 0 ? (
                filtered.map((s) => (
                  <tr key={s.sessionId} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-mono font-medium text-slate-100 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-blue-400 shrink-0" />
                      <span title={s.sessionId}>{truncate(s.sessionId, 18)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {s.tokenCount} tokens
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-slate-300">{s.ttlSecondsRemaining}s</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleInvalidate(s.sessionId)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition"
                        title="Invalidate session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                    {loading ? 'Loading sessions...' : 'No active sessions currently stored in the Vault.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
