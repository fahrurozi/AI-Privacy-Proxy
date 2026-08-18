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
  const [filterProvider, setFilterProvider] = useState<string>('ALL');
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

  // Extract all unique providers present across audit events
  const allAvailableProviders = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      if (ev.providerId) {
        set.add(ev.providerId);
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
    setFilterProvider('ALL');
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
      if (filterAction !== 'ALL' && e.action !== filterAction) return false;
      if (filterStatus !== 'ALL') {
        const code = e.upstreamStatus || 200;
        if (filterStatus === '2XX' && (code < 200 || code >= 300)) return false;
        if (filterStatus === '4XX' && (code < 400 || code >= 500)) return false;
        if (filterStatus === '5XX' && code < 500) return false;
      }
      if (filterProvider !== 'ALL') {
        if (!e.providerId || e.providerId.toLowerCase() !== filterProvider.toLowerCase()) {
          return false;
        }
      }
      if (selectedEntities.length > 0) {
        const hasMatchingEntity = selectedEntities.some((selected) =>
          e.entitiesDetected.includes(selected)
        );
        if (!hasMatchingEntity) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesRequestId = e.requestId.toLowerCase().includes(q);
        const matchesSessionId = e.sessionId.toLowerCase().includes(q);
        const matchesPath = e.path.toLowerCase().includes(q);
        const matchesProvider = (e.providerId || '').toLowerCase().includes(q);
        const matchesClientIp = (e.clientIp || '').toLowerCase().includes(q);
        const matchesEntities = e.entitiesDetected.some((ent) => ent.toLowerCase().includes(q));

        if (
          !matchesRequestId &&
          !matchesSessionId &&
          !matchesPath &&
          !matchesProvider &&
          !matchesClientIp &&
          !matchesEntities
        ) {
          return false;
        }
      }
      return true;
    });
  }, [events, filterAction, filterStatus, filterProvider, selectedEntities, search]);

  const exportCsv = () => {
    if (filteredEvents.length === 0) return;
    const header = [
      'Timestamp',
      'RequestId',
      'SessionId',
      'Provider',
      'Action',
      'EntitiesDetected',
      'Path',
      'TotalLatencyMs',
      'PresidioLatencyMs',
      'LlmLatencyMs',
      'ProxyOverheadMs',
      'ClientIP',
      'Status',
    ];
    const rows = filteredEvents.map((e) => [
      new Date(e.timestamp).toISOString(),
      e.requestId,
      e.sessionId,
      e.providerId || 'default',
      e.action,
      `"${e.entitiesDetected.join(', ')}"`,
      `"${e.path}"`,
      e.totalLatencyMs || '',
      e.presidioLatencyMs || '',
      e.llmLatencyMs || '',
      e.proxyOverheadMs || '',
      `"${e.clientIp || ''}"`,
      e.upstreamStatus || 200,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `privacy_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: PrivacyAction) => {
    switch (action) {
      case 'TOKENIZE':
        return 'bg-primary-container text-primary-on-container border-primary/20';
      case 'MASK':
        return 'bg-secondary-container text-secondary-on-container border-secondary/20';
      case 'REDACT':
        return 'bg-tertiary-container text-tertiary-on-container border-tertiary/20';
      case 'BLOCK':
        return 'bg-error-container text-error-on-container border-error/20';
      case 'PASS':
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant/40';
    }
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    filterAction !== 'ALL' ||
    filterStatus !== 'ALL' ||
    filterProvider !== 'ALL' ||
    selectedEntities.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-primary" /> Privacy Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Real-time audit records of PII interception, cryptographic surrogate tokenization, process latency breakdown, and policy actions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredEvents.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold rounded-m3-full border border-outline-variant/60 transition disabled:opacity-50 shadow-m3-1"
          >
            <Download className="w-4 h-4" /> Export CSV ({filteredEvents.length})
          </button>
          <button
            type="button"
            onClick={loadAuditLogs}
            className="p-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-m3-full border border-outline-variant/50 transition shadow-m3-1"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar (Material 3 Card) */}
      <div className="bg-surface-container-low border border-outline-variant/60 p-5 rounded-m3-xl space-y-3.5 shadow-m3-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search req, session, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/60 rounded-m3-full pl-9 pr-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
            />
          </div>

          {/* 2. Provider Filter */}
          <div>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/60 rounded-m3-full px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
            >
              <option value="ALL">All Providers</option>
              {allAvailableProviders.map((p) => (
                <option key={p} value={p}>
                  Provider: {p}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Action Filter */}
          <div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/60 rounded-m3-full px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
            >
              <option value="ALL">All Actions</option>
              <option value="TOKENIZE">TOKENIZE (Surrogates)</option>
              <option value="MASK">MASK (Reversible)</option>
              <option value="BLOCK">BLOCK (Blocked Threats)</option>
              <option value="REDACT">REDACT (Permanent)</option>
              <option value="PASS">PASS (Clean Traffic)</option>
            </select>
          </div>

          {/* 4. HTTP Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/60 rounded-m3-full px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="2XX">2xx OK (Success)</option>
              <option value="4XX">4xx Blocked / Bad</option>
              <option value="5XX">5xx Upstream Error</option>
            </select>
          </div>

          {/* 5. Multi-Select Entities Dropdown */}
          <div className="relative" ref={entityDropdownRef}>
            <button
              type="button"
              onClick={() => setIsEntityDropdownOpen(!isEntityDropdownOpen)}
              className={`w-full flex items-center justify-between bg-surface-container border rounded-m3-full px-3.5 py-2 text-xs transition ${
                selectedEntities.length > 0
                  ? 'border-primary text-primary font-bold shadow-sm'
                  : 'border-outline-variant/60 text-on-surface-variant'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  {selectedEntities.length === 0
                    ? 'Filter Entities (All)'
                    : `Entities (${selectedEntities.length})`}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
            </button>

            {/* Dropdown Menu Popup */}
            {isEntityDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-surface-container-high border border-outline-variant/60 rounded-m3-xl shadow-m3-4 p-3 z-30 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40 px-1 text-[11px]">
                  <span className="font-bold text-on-surface">Select Sensitive Entities</span>
                  {selectedEntities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedEntities([])}
                      className="text-primary hover:underline font-semibold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {allAvailableEntities.map((ent) => {
                    const isSelected = selectedEntities.includes(ent);
                    return (
                      <label
                        key={ent}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-m3-md text-xs cursor-pointer select-none transition ${
                          isSelected
                            ? 'bg-primary-container text-primary-on-container font-semibold'
                            : 'text-on-surface hover:bg-surface-container-highest'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEntitySelection(ent)}
                          className="rounded-m3-xs border-outline-variant bg-surface text-primary focus:ring-0 w-3.5 h-3.5"
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
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-variant/40 text-xs">
            <span className="text-[11px] text-on-surface-variant flex items-center gap-1 font-semibold">
              <Filter className="w-3 h-3 text-primary" /> Active:
            </span>

            {filterProvider !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-m3-full bg-surface-container-high text-on-surface border border-outline-variant/50 text-[11px] font-semibold">
                Provider: <strong>{filterProvider}</strong>
                <button type="button" onClick={() => setFilterProvider('ALL')} className="hover:text-error">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterAction !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-m3-full bg-surface-container-high text-on-surface border border-outline-variant/50 text-[11px] font-semibold">
                Action: <strong>{filterAction}</strong>
                <button type="button" onClick={() => setFilterAction('ALL')} className="hover:text-error">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-m3-full bg-surface-container-high text-on-surface border border-outline-variant/50 text-[11px] font-semibold">
                Status: <strong>{filterStatus}</strong>
                <button type="button" onClick={() => setFilterStatus('ALL')} className="hover:text-error">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedEntities.map((ent) => (
              <span
                key={ent}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-m3-full bg-primary-container text-primary-on-container text-[11px] font-mono font-bold"
              >
                {ent}
                <button type="button" onClick={() => toggleEntitySelection(ent)} className="hover:text-error">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] text-on-surface-variant hover:text-error underline ml-auto font-medium"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Audit Table with Expandable Row Detail Dropdown */}
      <div className="bg-surface-container-low border border-outline-variant/60 rounded-m3-xl overflow-hidden shadow-m3-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-on-surface">
            <thead className="bg-surface-container text-xs text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/40 select-none">
              <tr>
                <th className="px-4 py-4 w-10"></th>
                <th className="px-4 py-4 font-semibold">Timestamp</th>
                <th className="px-4 py-4 font-semibold">Provider</th>
                <th className="px-4 py-4 font-semibold">Policy Action</th>
                <th className="px-4 py-4 font-semibold">Entities Detected</th>
                <th className="px-4 py-4 font-semibold">Process Time</th>
                <th className="px-4 py-4 font-semibold">Target Path</th>
                <th className="px-4 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 font-sans">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((e) => {
                  const isExpanded = expandedRowIds.has(e.id);
                  return (
                    <React.Fragment key={e.id}>
                      {/* Main Row */}
                      <tr
                        onClick={() => toggleRowExpanded(e.id)}
                        className={`cursor-pointer transition select-none ${
                          isExpanded ? 'bg-surface-container-high/60' : 'hover:bg-surface-container-high/30'
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            className="text-on-surface-variant hover:text-on-surface transition p-1 rounded-m3-full"
                            aria-label="Expand audit details"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-primary" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-3.5 text-xs font-mono text-on-surface-variant whitespace-nowrap">
                          {formatDate(e.timestamp)}
                        </td>

                        {/* Provider Badge */}
                        <td className="px-4 py-3.5 text-xs font-mono">
                          {e.providerId ? (
                            <span className="px-2.5 py-0.5 rounded-m3-full bg-tertiary-container text-tertiary-on-container font-bold text-[11px]">
                              {e.providerId}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant text-[11px]">default</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-m3-full text-xs font-bold border ${getActionBadge(
                              e.action
                            )}`}
                          >
                            {e.action}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          {e.entitiesDetected.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {Array.from(new Set(e.entitiesDetected)).map((ent, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-m3-xs text-[11px] font-mono bg-surface-container-highest text-primary font-semibold"
                                >
                                  {ent}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-on-surface-variant">None</span>
                          )}
                        </td>

                        {/* Process Time / Latency Breakdown Column */}
                        <td className="px-4 py-3.5 text-xs font-mono whitespace-nowrap">
                          {e.totalLatencyMs !== undefined ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-on-surface flex items-center gap-1.5">
                                <span>⚡ {e.totalLatencyMs}ms</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                                {e.llmLatencyMs !== undefined && (
                                  <span className="text-amber-500 font-semibold" title="LLM Roundtrip Time">
                                    LLM {e.llmLatencyMs}ms
                                  </span>
                                )}
                                {e.presidioLatencyMs !== undefined && e.presidioLatencyMs > 0 && (
                                  <span className="text-primary font-semibold" title="Presidio PII Interception Time">
                                    PII {e.presidioLatencyMs}ms
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-on-surface-variant">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-xs text-on-surface truncate max-w-[200px]">
                          {e.path}
                        </td>

                        <td className="px-4 py-3.5 text-right font-mono text-xs">
                          <span
                            className={`px-2.5 py-0.5 rounded-m3-full font-bold ${
                              e.action === 'BLOCK' || (e.upstreamStatus && e.upstreamStatus >= 400)
                                ? 'text-error-on-container bg-error-container'
                                : 'text-secondary-on-container bg-secondary-container'
                            }`}
                          >
                            {e.upstreamStatus || (e.action === 'BLOCK' ? 400 : 200)}
                          </span>
                        </td>
                      </tr>

                      {/* Dropdown Detail Accordion Row */}
                      {isExpanded && (
                        <tr className="bg-surface-container/70 border-b border-outline-variant/40">
                          <td colSpan={8} className="p-4 sm:p-6">
                            <div className="bg-surface-container-low border border-outline-variant/60 rounded-m3-xl p-5 space-y-5 shadow-m3-1">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/40 pb-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                                  <Activity className="w-4 h-4 text-primary" />
                                  <span>Audit Record Deep Inspection</span>
                                </div>
                                <div className="text-[11px] text-on-surface-variant font-mono">
                                  {new Date(e.timestamp).toUTCString()}
                                </div>
                              </div>

                              {/* Process Time / Latency Bottleneck Breakdown Card */}
                              <div className="bg-surface-container p-4 rounded-m3-lg border border-outline-variant/40 space-y-3">
                                <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                                  <span className="flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-primary" /> Latency & Bottleneck Analysis
                                  </span>
                                  <span className="font-mono text-secondary font-bold text-xs">
                                    Total: {e.totalLatencyMs ?? 0}ms
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                                  <div className="bg-surface-container-high p-3 rounded-m3-md border border-amber-500/20">
                                    <div className="text-[10px] text-amber-500 uppercase font-bold">
                                      LLM Upstream Time
                                    </div>
                                    <div className="text-base font-extrabold text-on-surface mt-1">
                                      {e.llmLatencyMs ?? 0}ms
                                    </div>
                                    <div className="text-[10px] text-on-surface-variant mt-0.5">
                                      {e.totalLatencyMs
                                        ? `${Math.round(((e.llmLatencyMs || 0) / e.totalLatencyMs) * 100)}% of total`
                                        : 'Cloud model processing'}
                                    </div>
                                  </div>

                                  <div className="bg-surface-container-high p-3 rounded-m3-md border border-primary/20">
                                    <div className="text-[10px] text-primary uppercase font-bold">
                                      PII Presidio Analysis
                                    </div>
                                    <div className="text-base font-extrabold text-on-surface mt-1">
                                      {e.presidioLatencyMs ?? 0}ms
                                    </div>
                                    <div className="text-[10px] text-on-surface-variant mt-0.5">
                                      {e.totalLatencyMs
                                        ? `${Math.round(((e.presidioLatencyMs || 0) / e.totalLatencyMs) * 100)}% of total`
                                        : 'Regex/NLP detection'}
                                    </div>
                                  </div>

                                  <div className="bg-surface-container-high p-3 rounded-m3-md border border-secondary/20">
                                    <div className="text-[10px] text-secondary uppercase font-bold">
                                      Proxy Overhead
                                    </div>
                                    <div className="text-base font-extrabold text-on-surface mt-1">
                                      {e.proxyOverheadMs ?? 0}ms
                                    </div>
                                    <div className="text-[10px] text-on-surface-variant mt-0.5">
                                      {e.totalLatencyMs
                                        ? `${Math.round(((e.proxyOverheadMs || 0) / e.totalLatencyMs) * 100)}% of total`
                                        : 'Vault + token swap'}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                {/* Request ID */}
                                <div className="bg-surface-container p-3.5 rounded-m3-md border border-outline-variant/40 space-y-1">
                                  <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                                    Request ID
                                  </div>
                                  <div className="flex items-center justify-between gap-2 font-mono text-on-surface text-[11px]">
                                    <span className="truncate">{e.requestId}</span>
                                    <button
                                      type="button"
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        handleCopyText(e.requestId, `req-${e.id}`);
                                      }}
                                      className="text-on-surface-variant hover:text-on-surface transition"
                                      title="Copy Request ID"
                                    >
                                      {copiedId === `req-${e.id}` ? (
                                        <Check className="w-3.5 h-3.5 text-secondary" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Session ID */}
                                <div className="bg-surface-container p-3.5 rounded-m3-md border border-outline-variant/40 space-y-1">
                                  <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                                    Privacy Session ID (Vault Key)
                                  </div>
                                  <div className="flex items-center justify-between gap-2 font-mono text-on-surface text-[11px]">
                                    <span className="truncate">{e.sessionId}</span>
                                    <button
                                      type="button"
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        handleCopyText(e.sessionId, `sess-${e.id}`);
                                      }}
                                      className="text-on-surface-variant hover:text-on-surface transition"
                                      title="Copy Session ID"
                                    >
                                      {copiedId === `sess-${e.id}` ? (
                                        <Check className="w-3.5 h-3.5 text-secondary" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Provider ID */}
                                <div className="bg-surface-container p-3.5 rounded-m3-md border border-outline-variant/40 space-y-1">
                                  <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                                    Upstream Provider ID
                                  </div>
                                  <div className="font-mono text-tertiary font-bold text-[11px]">
                                    {e.providerId || 'default'}
                                  </div>
                                </div>

                                {/* Client IP */}
                                <div className="bg-surface-container p-3.5 rounded-m3-md border border-outline-variant/40 space-y-1">
                                  <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                                    Client IP Address
                                  </div>
                                  <div className="font-mono text-on-surface text-[11px]">
                                    {e.clientIp || '127.0.0.1 (Local Client)'}
                                  </div>
                                </div>

                                {/* Target Endpoint */}
                                <div className="bg-surface-container p-3.5 rounded-m3-md border border-outline-variant/40 space-y-1">
                                  <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                                    Upstream Route
                                  </div>
                                  <div className="font-mono text-primary font-semibold text-[11px] truncate">
                                    {e.path}
                                  </div>
                                </div>

                                {/* Policy Action */}
                                <div className="bg-surface-container p-3.5 rounded-m3-md border border-outline-variant/40 space-y-1">
                                  <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                                    Enforced Policy Action
                                  </div>
                                  <div className="font-bold text-on-surface">
                                    {e.action === 'TOKENIZE' && '✅ Cryptographic Surrogate Tokenization'}
                                    {e.action === 'MASK' && '🎭 Reversible Contextual Masking'}
                                    {e.action === 'BLOCK' && '🚫 Request Immediately Blocked (Threat Intercepted)'}
                                    {e.action === 'REDACT' && '⚠️ Plaintext Permanent Redaction ([REDACTED])'}
                                    {e.action === 'PASS' && '🛡️ Clean Request Passed to Upstream'}
                                  </div>
                                </div>
                              </div>

                              {/* Detected Entities Breakdown */}
                              <div className="bg-surface-container p-4 rounded-m3-md border border-outline-variant/40 space-y-2">
                                <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-1.5">
                                  <Layers className="w-3 h-3 text-primary" />
                                  <span>Entities Intercepted & Sanitized ({Array.from(new Set(e.entitiesDetected)).length})</span>
                                </div>
                                {e.entitiesDetected.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {Array.from(new Set(e.entitiesDetected)).map((ent, idx) => (
                                      <div
                                        key={idx}
                                        className="px-3 py-1.5 rounded-m3-full bg-surface-container-high border border-outline-variant/50 flex items-center gap-1.5 text-xs font-mono text-primary font-bold shadow-sm"
                                      >
                                        <Lock className="w-3 h-3" />
                                        <span>{ent}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-on-surface-variant">
                                    No sensitive PII or secrets detected in this request.
                                  </p>
                                )}
                              </div>

                              {/* Zero-Leak Security Notice */}
                              <div className="p-4 bg-primary-container/30 border border-primary/20 rounded-m3-lg flex items-start gap-3 text-xs text-on-surface">
                                <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
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
                  <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant text-xs">
                    {loading ? (
                      'Loading audit records...'
                    ) : hasActiveFilters ? (
                      <div className="space-y-2">
                        <AlertCircle className="w-6 h-6 text-on-surface-variant mx-auto" />
                        <div>No audit records match your selected filter criteria.</div>
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="text-xs text-primary hover:underline font-bold"
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
