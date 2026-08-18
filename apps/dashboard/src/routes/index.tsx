import React, { useEffect, useState } from 'react';
import { MetricsSummary } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import {
  Shield,
  ShieldAlert,
  KeyRound,
  Activity,
  Server,
  Database,
  Brain,
  ArrowRight,
  Zap,
  Calendar,
  X,
  Filter,
} from 'lucide-react';

export function OverviewPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date Filter State
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    try {
      let url = '/admin/metrics';
      const params = new URLSearchParams();

      if (dateRangePreset === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        params.append('startDate', start.toISOString());
      } else if (dateRangePreset === '7d') {
        const start = new Date(Date.now() - 7 * 86400 * 1000);
        params.append('startDate', start.toISOString());
      } else if (dateRangePreset === '30d') {
        const start = new Date(Date.now() - 30 * 86400 * 1000);
        params.append('startDate', start.toISOString());
      } else if (dateRangePreset === 'custom') {
        if (startDate) params.append('startDate', new Date(startDate).toISOString());
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          params.append('endDate', end.toISOString());
        }
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const data = await fetchApi<MetricsSummary>(url);
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [dateRangePreset, startDate, endDate]);

  const handleResetDateFilter = () => {
    setDateRangePreset('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Material 3 Hero Card Banner */}
      <div className="bg-surface-container border border-outline-variant/60 p-6 sm:p-8 rounded-m3-xl shadow-m3-1 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-m3-full text-xs font-semibold bg-primary-container text-primary-on-container">
              <Zap className="w-3.5 h-3.5" /> Gateway Active
            </span>
            <span className="text-xs font-medium text-on-surface-variant">Zero-Plaintext Leakage Mode</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
            AI Privacy Proxy Gateway
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-xl leading-relaxed">
            Real-time cryptographic tokenization & PII interceptor gateway safeguarding prompts before reaching AI LLM routers.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => onNavigate('monitoring')}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-on text-xs font-semibold rounded-m3-full shadow-m3-1 hover:shadow-m3-2 transition-all m3-state-layer"
          >
            <Activity className="w-4 h-4" /> Live Monitor
          </button>
          <button
            onClick={() => onNavigate('policy')}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest text-on-surface text-xs font-semibold rounded-m3-full border border-outline-variant/60 hover:bg-surface-container-high transition-all"
          >
            Edit Policies <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-surface-container-low border border-outline-variant/60 p-4 sm:p-5 rounded-m3-xl shadow-m3-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
          <Calendar className="w-4 h-4 text-primary" />
          <span>Metrics Timeframe:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Presets */}
          <div className="flex items-center bg-surface-container rounded-m3-full p-1 border border-outline-variant/50">
            <button
              onClick={() => setDateRangePreset('all')}
              className={`px-3 py-1 rounded-m3-full text-xs font-semibold transition ${
                dateRangePreset === 'all'
                  ? 'bg-primary text-primary-on shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateRangePreset('today')}
              className={`px-3 py-1 rounded-m3-full text-xs font-semibold transition ${
                dateRangePreset === 'today'
                  ? 'bg-primary text-primary-on shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRangePreset('7d')}
              className={`px-3 py-1 rounded-m3-full text-xs font-semibold transition ${
                dateRangePreset === '7d'
                  ? 'bg-primary text-primary-on shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRangePreset('30d')}
              className={`px-3 py-1 rounded-m3-full text-xs font-semibold transition ${
                dateRangePreset === '30d'
                  ? 'bg-primary text-primary-on shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRangePreset('custom')}
              className={`px-3 py-1 rounded-m3-full text-xs font-semibold transition ${
                dateRangePreset === 'custom'
                  ? 'bg-primary text-primary-on shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Custom Date Pickers */}
          {dateRangePreset === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in duration-150">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-surface-container border border-outline-variant/60 rounded-m3-full px-3 py-1 text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
                title="Start Date"
              />
              <span className="text-on-surface-variant text-xs font-medium">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-surface-container border border-outline-variant/60 rounded-m3-full px-3 py-1 text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
                title="End Date"
              />
            </div>
          )}

          {dateRangePreset !== 'all' && (
            <button
              onClick={handleResetDateFilter}
              className="p-1.5 text-on-surface-variant hover:text-error rounded-m3-full hover:bg-surface-container-high transition"
              title="Reset date filter"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error-container border border-error/30 rounded-m3-lg text-error-on-container text-xs font-medium">
          Failed to fetch metrics: {error} (Check if Proxy is running and your Admin API Key is correct)
        </div>
      )}

      {/* Material 3 Key Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Requests */}
        <div className="bg-surface-container-low border border-outline-variant/60 p-5 rounded-m3-lg shadow-m3-1 transition-all hover:shadow-m3-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Requests</span>
            <div className="w-10 h-10 rounded-m3-full bg-primary-container text-primary-on-container flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-on-surface">
            {metrics ? metrics.totalRequests.toLocaleString() : '0'}
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">
            {dateRangePreset === 'all' ? 'All inbound LLM calls' : 'Inbound calls in timeframe'}
          </p>
        </div>

        {/* Blocked Threats */}
        <div className="bg-surface-container-low border border-outline-variant/60 p-5 rounded-m3-lg shadow-m3-1 transition-all hover:shadow-m3-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Blocked Secrets</span>
            <div className="w-10 h-10 rounded-m3-full bg-error-container text-error-on-container flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-error">
            {metrics ? metrics.blockedRequests.toLocaleString() : '0'}
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">Threats prevented at edge</p>
        </div>

        {/* Tokens Generated */}
        <div className="bg-surface-container-low border border-outline-variant/60 p-5 rounded-m3-lg shadow-m3-1 transition-all hover:shadow-m3-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tokens Generated</span>
            <div className="w-10 h-10 rounded-m3-full bg-secondary-container text-secondary-on-container flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-secondary">
            {metrics ? metrics.tokensGenerated.toLocaleString() : '0'}
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">PII entities anonymized</p>
        </div>

        {/* Active Streams */}
        <div className="bg-surface-container-low border border-outline-variant/60 p-5 rounded-m3-lg shadow-m3-1 transition-all hover:shadow-m3-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Active Streams</span>
            <div className="w-10 h-10 rounded-m3-full bg-tertiary-container text-tertiary-on-container flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-extrabold text-tertiary">
            {metrics ? metrics.activeStreams : '0'}
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">Concurrent SSE sessions</p>
        </div>
      </div>

      {/* Services Status & Latency Breakdown (Material 3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Component Health */}
        <div className="bg-surface-container-low border border-outline-variant/60 p-6 rounded-m3-xl shadow-m3-1 space-y-4">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" /> Component Health
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-m3-md border border-outline-variant/40">
              <div className="flex items-center gap-3">
                <Server className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-on-surface">Fastify Core Proxy</span>
              </div>
              <span className="px-2.5 py-1 rounded-m3-full text-[11px] font-bold bg-secondary-container text-secondary-on-container">
                Online
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-m3-md border border-outline-variant/40">
              <div className="flex items-center gap-3">
                <Brain className="w-4 h-4 text-tertiary" />
                <span className="text-xs font-semibold text-on-surface">Presidio NLP Engine</span>
              </div>
              <span className={`px-2.5 py-1 rounded-m3-full text-[11px] font-bold ${
                metrics?.status.presidio === 'healthy'
                  ? 'bg-secondary-container text-secondary-on-container'
                  : 'bg-tertiary-container text-tertiary-on-container'
              }`}>
                {metrics?.status.presidio === 'healthy' ? 'Online' : 'Fallback Engine'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-m3-md border border-outline-variant/40">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-error" />
                <span className="text-xs font-semibold text-on-surface">Redis Token Vault</span>
              </div>
              <span className={`px-2.5 py-1 rounded-m3-full text-[11px] font-bold ${
                metrics?.status.redis === 'healthy'
                  ? 'bg-secondary-container text-secondary-on-container'
                  : 'bg-primary-container text-primary-on-container'
              }`}>
                {metrics?.status.redis === 'healthy' ? 'Redis 7' : 'Memory Fallback'}
              </span>
            </div>
          </div>
        </div>

        {/* Latency Metrics */}
        <div className="bg-surface-container-low border border-outline-variant/60 p-6 rounded-m3-xl shadow-m3-1 space-y-4">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Activity className="w-4 h-4 text-secondary" /> Average Latencies
          </h2>
          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-on-surface-variant">Presidio NLP Analysis</span>
                <span className="font-mono text-on-surface font-semibold">{metrics?.presidioLatencyMs || 0} ms</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container-highest rounded-m3-full overflow-hidden">
                <div
                  className="h-full bg-tertiary rounded-m3-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((metrics?.presidioLatencyMs || 0) / 100) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-on-surface-variant">Token Vault (Get / Restore)</span>
                <span className="font-mono text-on-surface font-semibold">{metrics?.vaultLatencyMs || 2} ms</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container-highest rounded-m3-full overflow-hidden">
                <div className="h-full bg-secondary rounded-m3-full transition-all duration-500" style={{ width: '4%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-on-surface-variant">Total Proxy Overhead</span>
                <span className="font-mono text-on-surface font-semibold">{metrics?.proxyLatencyMs || 3} ms</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container-highest rounded-m3-full overflow-hidden">
                <div className="h-full bg-primary rounded-m3-full transition-all duration-500" style={{ width: '8%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Detected Entities Distribution */}
        <div className="bg-surface-container-low border border-outline-variant/60 p-6 rounded-m3-xl shadow-m3-1 space-y-4">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Entities Sanitized
          </h2>
          {metrics && Object.keys(metrics.entityBreakdown).length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {Object.entries(metrics.entityBreakdown).map(([entity, count]) => (
                <div key={entity} className="flex items-center justify-between text-xs p-2.5 bg-surface-container rounded-m3-md border border-outline-variant/40">
                  <span className="font-mono text-primary font-semibold">{entity}</span>
                  <span className="font-bold text-on-surface">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-36 flex flex-col items-center justify-center text-on-surface-variant text-xs text-center">
              <Shield className="w-8 h-8 mb-2 opacity-30" />
              <span className="font-medium">No entities detected for this timeframe.</span>
              <span className="mt-1 text-[11px] text-on-surface-variant/80">Send requests through proxy port 8080.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
