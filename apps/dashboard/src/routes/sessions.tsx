import React, { useEffect, useState } from 'react';
import { ActiveSession } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { formatDate, truncate } from '../lib/utils.js';
import { KeyRound, Trash2, RefreshCw, Clock, ShieldCheck, Search } from 'lucide-react';

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
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
            Session Token Vault
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Ephemeral active token sessions with automatic TTL expiry. Zero plaintext values stored on disk.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search session ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface-container-high border border-outline-variant/60 rounded-m3-full pl-9 pr-4 py-2 text-xs text-on-surface focus:outline-none focus:border-primary w-48 sm:w-64 font-mono shadow-sm"
            />
          </div>
          <button
            onClick={loadSessions}
            className="p-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-m3-full border border-outline-variant/50 transition shadow-m3-1"
            title="Refresh sessions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Security Assurance Banner (M3 Callout) */}
      <div className="p-4 bg-primary-container/40 border border-primary/20 rounded-m3-lg flex items-center gap-3 text-xs text-on-surface">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
        <span>
          <strong>Zero-Knowledge Console:</strong> In accordance with strict security architecture, this console only displays ephemeral session IDs and token counts. Token values themselves never leave memory or enter the UI.
        </span>
      </div>

      {/* Sessions Table (Material 3 Container Card) */}
      <div className="bg-surface-container-low border border-outline-variant/60 rounded-m3-xl overflow-hidden shadow-m3-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-on-surface">
            <thead className="bg-surface-container text-xs text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/40 select-none">
              <tr>
                <th className="px-6 py-4 font-semibold">Session ID</th>
                <th className="px-6 py-4 font-semibold">Tokens Cached</th>
                <th className="px-6 py-4 font-semibold">Created At</th>
                <th className="px-6 py-4 font-semibold">TTL Remaining</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 font-sans">
              {filtered.length > 0 ? (
                filtered.map((s) => (
                  <tr key={s.sessionId} className="hover:bg-surface-container-high/50 transition">
                    <td className="px-6 py-4 font-mono font-medium text-on-surface flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-primary shrink-0" />
                      <span title={s.sessionId}>{truncate(s.sessionId, 18)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-m3-full text-xs font-bold bg-secondary-container text-secondary-on-container">
                        {s.tokenCount} tokens
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-3.5 h-3.5 text-on-surface-variant" />
                        <span className="font-mono font-semibold text-on-surface">{s.ttlSecondsRemaining}s</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleInvalidate(s.sessionId)}
                        className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-m3-full transition"
                        title="Invalidate session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant text-xs">
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
