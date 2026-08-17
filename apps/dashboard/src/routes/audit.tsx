import React, { useEffect, useState } from 'react';
import { AuditEvent, PrivacyAction } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { formatDate, truncate } from '../lib/utils.js';
import { ShieldAlert, Download, RefreshCw, Filter, Search } from 'lucide-react';

export function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<{ events: AuditEvent[] }>('/admin/audit');
      setEvents(data.events || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filtered = events.filter((e) => {
    const matchesAction = filterAction === 'ALL' || e.action === filterAction;
    const matchesSearch =
      e.requestId.toLowerCase().includes(search.toLowerCase()) ||
      e.sessionId.toLowerCase().includes(search.toLowerCase()) ||
      e.path.toLowerCase().includes(search.toLowerCase()) ||
      e.entitiesDetected.some((ent) => ent.toLowerCase().includes(search.toLowerCase()));
    return matchesAction && matchesSearch;
  });

  const exportCsv = () => {
    if (events.length === 0) return;
    const header = ['Timestamp', 'RequestId', 'SessionId', 'Action', 'EntitiesDetected', 'Path', 'Status'];
    const rows = events.map((e) => [
      new Date(e.timestamp).toISOString(),
      e.requestId,
      e.sessionId,
      e.action,
      `"${e.entitiesDetected.join(', ')}"`,
      e.path,
      e.upstreamStatus || 200,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `privacy_audit_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeColor = (action: PrivacyAction) => {
    switch (action) {
      case 'TOKENIZE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'REDACT':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'BLOCK':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'PASS':
        return 'bg-slate-700/50 text-slate-400 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Privacy Audit Trail</h1>
          <p className="text-sm text-slate-400">Structured audit logs of entity detection and policy actions (zero plaintext content stored).</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={loadAuditLogs}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search request, session, entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-full sm:w-64"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Actions</option>
            <option value="BLOCK">BLOCK (Blocked Threats)</option>
            <option value="TOKENIZE">TOKENIZE</option>
            <option value="REDACT">REDACT</option>
            <option value="PASS">PASS</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entities Detected</th>
                <th className="px-6 py-4">Session ID</th>
                <th className="px-6 py-4">Target Path</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length > 0 ? (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                      {formatDate(e.timestamp)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionBadgeColor(e.action)}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {e.entitiesDetected.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {e.entitiesDetected.map((ent, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-blue-300 border border-slate-700">
                              {ent}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {truncate(e.sessionId, 12)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      {e.path}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs">
                      <span className={e.action === 'BLOCK' ? 'text-red-400' : 'text-emerald-400'}>
                        {e.upstreamStatus || 200}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                    {loading ? 'Loading audit records...' : 'No audit events recorded yet.'}
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
