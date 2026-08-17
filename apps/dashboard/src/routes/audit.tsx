import React, { useEffect, useState, useMemo, useRef } from 'react';
import { AuditEvent, PrivacyAction } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';
import {
  Download,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  X,
  Shield,
  Layers,
  Activity,
  AlertCircle,
  Lock,
} from 'lucide-react';

const KNOWN_ENTITIES = [
  'PERSON',
  'EMAIL_ADDRESS',
  'PHONE_NUMBER',
  'IP_ADDRESS',
  'ETHEREUM_ADDRESS',
  'SOLANA_ADDRESS',
  'CREDIT_CARD',
  'US_SSN',
  'US_PASSPORT',
  'PRIVATE_KEY',
  'SEED_PHRASE',
  'API_KEY',
  'PASSWORD',
];

export function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [isEntityDropdownOpen, setIsEntityDropdownOpen] = useState(false);
  const entityDropdownRef = useRef<HTMLDivElement>(null);

  // Expanded Row IDs
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Close entity multi-select dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (entityDropdownRef.current && !entityDropdownRef.current.contains(event.target as Node)) {
        setIsEntityDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract all unique entities detected across all logs
  const allAvailableEntities = useMemo(() => {
    const set = new Set<string>(KNOWN_ENTITIES);
    for (const ev of events) {
      for (const ent of ev.entitiesDetected || []) {
        set.add(ent);
      }
    }
    return Array.from(set).sort();
  }, [events]);

  const toggleEntitySelection = (entity: string) => {
    setSelectedEntities((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
    );
  };

  const clearAllFilters = () => {
    setSearch('');
    setFilterAction('ALL');
    setFilterStatus('ALL');
    setSelectedEntities([]);
  };

  const toggleRowExpanded = (id: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // 1. Action Filter
      if (filterAction !== 'ALL' && e.action !== filterAction) {
        return false;
      }

      // 2. Status Filter
      if (filterStatus !== 'ALL') {
        const code = e.upstreamStatus || 200;
        if (filterStatus === '2XX' && (code < 200 || code >= 300)) return false;
        if (filterStatus === '4XX' && (code < 400 || code >= 500)) return false;
        if (filterStatus === '5XX' && code < 500) return false;
      }

      // 3. Multi-Select Entities Filter
      if (selectedEntities.length > 0) {
        const hasMatchingEntity = selectedEntities.some((selected) =>
          e.entitiesDetected.includes(selected)
        );
        if (!hasMatchingEntity) return false;
      }

      // 4. Search text
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesRequestId = e.requestId.toLowerCase().includes(q);
        const matchesSessionId = e.sessionId.toLowerCase().includes(q);
        const matchesPath = e.path.toLowerCase().includes(q);
        const matchesClientIp = (e.clientIp || '').toLowerCase().includes(q);
        const matchesEntities = e.entitiesDetected.some((ent) => ent.toLowerCase().includes(q));

        if (!matchesRequestId && !matchesSessionId && !matchesPath && !matchesClientIp && !matchesEntities) {
          return false;
        }
      }

      return true;
    });
  }, [events, filterAction, filterStatus, selectedEntities, search]);

  const exportCsv = () => {
    if (filteredEvents.length === 0) return;
    const header = ['Timestamp', 'RequestId', 'SessionId', 'Action', 'EntitiesDetected', 'Path', 'ClientIP', 'Status'];
    const rows = filteredEvents.map((e) => [
      new Date(e.timestamp).toISOString(),
      e.requestId,
      e.sessionId,
      e.action,
      `"${e.entitiesDetected.join(', ')}"`,
      `"${e.path}"`,
      `"${e.clientIp || ''}"`,
      e.upstreamStatus || 200,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `privacy_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeColor = (action: PrivacyAction) => {
    switch (action) {
      case 'TOKENIZE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'REDACT':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'BLOCK':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'PASS':
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const hasActiveFilters = search.trim() !== '' || filterAction !== 'ALL' || filterStatus !== 'ALL' || selectedEntities.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" /> Privacy Audit Trail
          </h1>
          <p className="text-sm text-slate-400">
            Real-time audit records of PII interception, cryptographic surrogate tokenization, and policy actions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredEvents.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition disabled:opacity-50 shadow"
          >
            <Download className="w-4 h-4" /> Export CSV ({filteredEvents.length})
          </button>
          <button
            type="button"
            onClick={loadAuditLogs}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition shadow"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* 1. Search Box */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search request, session, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* 2. Action Filter */}
          <div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="ALL">All Actions</option>
              <option value="TOKENIZE">TOKENIZE (Surrogate Tokens)</option>
              <option value="BLOCK">BLOCK (Threats Intercepted)</option>
              <option value="REDACT">REDACT (Permanently Masked)</option>
              <option value="PASS">PASS (Clean Traffic)</option>
            </select>
          </div>

          {/* 3. HTTP Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="ALL">All HTTP Statuses</option>
              <option value="2XX">2xx OK (Success)</option>
              <option value="4XX">4xx Blocked / Bad Request</option>
              <option value="5XX">5xx Upstream Errors</option>
            </select>
          </div>

          {/* 4. Multi-Select Entities Dropdown */}
          <div className="relative" ref={entityDropdownRef}>
            <button
              type="button"
              onClick={() => setIsEntityDropdownOpen(!isEntityDropdownOpen)}
              className={`w-full flex items-center justify-between bg-slate-950 border rounded-xl px-3 py-2 text-xs transition ${
                selectedEntities.length > 0
                  ? 'border-blue-500 text-blue-300 font-semibold'
                  : 'border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>
                  {selectedEntities.length === 0
                    ? 'Filter Entities (All)'
                    : `Entities (${selectedEntities.length} selected)`}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu Popup */}
            {isEntityDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-2.5 z-30 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 px-1 text-[11px]">
                  <span className="font-semibold text-slate-300">Select Sensitive Entities</span>
                  {selectedEntities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedEntities([])}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {allAvailableEntities.map((ent) => {
                    const isSelected = selectedEntities.includes(ent);
                    return (
                      <label
                        key={ent}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition ${
                          isSelected
                            ? 'bg-blue-950/60 text-blue-200 font-medium'
                            : 'text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEntitySelection(ent)}
                          className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                        />
                        <span className="font-mono text-[11px]">{ent}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Entity Filter Tags & Reset */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
              <Filter className="w-3 h-3 text-blue-400" /> Active Filters:
            </span>

            {filterAction !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
                Action: <strong>{filterAction}</strong>
                <button type="button" onClick={() => setFilterAction('ALL')} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
                Status: <strong>{filterStatus}</strong>
                <button type="button" onClick={() => setFilterStatus('ALL')} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedEntities.map((ent) => (
              <span
                key={ent}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-300 border border-blue-800 text-[11px] font-mono"
              >
                {ent}
                <button type="button" onClick={() => toggleEntitySelection(ent)} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] text-slate-400 hover:text-red-300 underline ml-auto"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Audit Table with Expandable Row Detail Dropdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800 select-none">
              <tr>
                <th className="px-4 py-3.5 w-10"></th>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Policy Action</th>
                <th className="px-4 py-3.5">Entities Detected</th>
                <th className="px-4 py-3.5">Target Path</th>
                <th className="px-4 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((e) => {
                  const isExpanded = expandedRowIds.has(e.id);
                  return (
                    <React.Fragment key={e.id}>
                      {/* Main Row */}
                      <tr
                        onClick={() => toggleRowExpanded(e.id)}
                        className={`cursor-pointer transition select-none ${
                          isExpanded ? 'bg-slate-800/40' : 'hover:bg-slate-800/20'
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            className="text-slate-400 hover:text-slate-200 transition"
                            aria-label="Expand audit details"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-blue-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">
                          {formatDate(e.timestamp)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getActionBadgeColor(
                              e.action
                            )}`}
                          >
                            {e.action}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {e.entitiesDetected.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {e.entitiesDetected.map((ent, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-950 text-blue-300 border border-slate-700/80 font-medium"
                                >
                                  {ent}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">None</span>
                          )}
                        </td>

                        <td className="px-4 py-3 font-mono text-xs text-slate-300">
                          {e.path}
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-xs">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold ${
                              e.action === 'BLOCK' || (e.upstreamStatus && e.upstreamStatus >= 400)
                                ? 'text-red-400 bg-red-950/40 border border-red-900/50'
                                : 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/50'
                            }`}
                          >
                            {e.upstreamStatus || (e.action === 'BLOCK' ? 400 : 200)}
                          </span>
                        </td>
                      </tr>

                      {/* Dropdown Detail Accordion Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-slate-800/80">
                          <td colSpan={6} className="p-4 sm:p-5">
                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4 shadow-inner">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                                  <Activity className="w-4 h-4 text-blue-400" />
                                  <span>Audit Record Deep Inspection</span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {new Date(e.timestamp).toUTCString()}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                {/* Request ID */}
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
                                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                    Request ID
                                  </div>
                                  <div className="flex items-center justify-between gap-2 font-mono text-slate-200 text-[11px]">
                                    <span className="truncate">{e.requestId}</span>
                                    <button
                                      type="button"
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        handleCopyText(e.requestId, `req-${e.id}`);
                                      }}
                                      className="text-slate-400 hover:text-slate-200 transition"
                                      title="Copy Request ID"
                                    >
                                      {copiedId === `req-${e.id}` ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Session ID */}
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
                                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                    Privacy Session ID (Vault Key)
                                  </div>
                                  <div className="flex items-center justify-between gap-2 font-mono text-slate-200 text-[11px]">
                                    <span className="truncate">{e.sessionId}</span>
                                    <button
                                      type="button"
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        handleCopyText(e.sessionId, `sess-${e.id}`);
                                      }}
                                      className="text-slate-400 hover:text-slate-200 transition"
                                      title="Copy Session ID"
                                    >
                                      {copiedId === `sess-${e.id}` ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Client IP */}
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
                                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                    Client IP Address
                                  </div>
                                  <div className="font-mono text-slate-200 text-[11px]">
                                    {e.clientIp || '127.0.0.1 (Local Client)'}
                                  </div>
                                </div>

                                {/* Target Endpoint */}
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
                                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                    Upstream Route
                                  </div>
                                  <div className="font-mono text-blue-300 text-[11px] truncate">
                                    {e.path}
                                  </div>
                                </div>

                                {/* Policy Action */}
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
                                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                    Enforced Policy Action
                                  </div>
                                  <div className="font-semibold text-slate-200">
                                    {e.action === 'TOKENIZE' && '✅ Cryptographic Surrogate Tokenization'}
                                    {e.action === 'BLOCK' && '🚫 Request Immediately Blocked (Threat Intercepted)'}
                                    {e.action === 'REDACT' && '⚠️ Plaintext Permanent Redaction ([REDACTED])'}
                                    {e.action === 'PASS' && '🛡️ Clean Request Passed to Upstream'}
                                  </div>
                                </div>

                                {/* HTTP Status */}
                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
                                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                    Upstream Response Code
                                  </div>
                                  <div className="font-mono text-slate-200 text-[11px]">
                                    HTTP {e.upstreamStatus || (e.action === 'BLOCK' ? 400 : 200)}
                                  </div>
                                </div>
                              </div>

                              {/* Detected Entities Breakdown */}
                              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-2">
                                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                                  <Layers className="w-3 h-3 text-blue-400" />
                                  <span>Entities Intercepted & Sanitized ({e.entitiesDetected.length})</span>
                                </div>
                                {e.entitiesDetected.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {e.entitiesDetected.map((ent, idx) => (
                                      <div
                                        key={idx}
                                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center gap-1.5 text-xs font-mono text-blue-200 shadow-sm"
                                      >
                                        <Lock className="w-3 h-3 text-blue-400" />
                                        <span>{ent}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500">
                                    No sensitive PII or secrets detected in this request.
                                  </p>
                                )}
                              </div>

                              {/* Zero-Leak Security Notice */}
                              <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-lg flex items-start gap-2.5 text-[11px] text-blue-200">
                                <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong>Zero-Leak Architecture:</strong> In accordance with strict privacy compliance, the actual plaintext values (names, passwords, private keys) are <em>never</em> recorded to disk or audit tables. Only metadata and surrogate token mappings exist in volatile memory.
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                    {loading ? (
                      'Loading audit records...'
                    ) : hasActiveFilters ? (
                      <div className="space-y-2">
                        <AlertCircle className="w-6 h-6 text-slate-500 mx-auto" />
                        <div>No audit records match your selected filter criteria.</div>
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                        >
                          Clear all filters
                        </button>
                      </div>
                    ) : (
                      'No audit events recorded yet. Send a request to see live privacy logs.'
                    )}
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
