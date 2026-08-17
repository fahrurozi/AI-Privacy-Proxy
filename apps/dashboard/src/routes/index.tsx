import React, { useEffect, useState } from 'react';
import { MetricsSummary } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { Shield, ShieldAlert, KeyRound, Activity, Server, Database, Brain, ArrowRight } from 'lucide-react';

export function OverviewPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await fetchApi<MetricsSummary>('/admin/metrics');
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
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-900/30 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Gateway Active
            </span>
            <span className="text-xs text-slate-400">Zero-Plaintext Leakage Mode</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">AI Privacy Proxy Gateway</h1>
          <p className="text-sm text-slate-400">Protecting sensitive data and secrets in real-time before reaching AI upstream providers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('monitoring')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition"
          >
            <Activity className="w-4 h-4" /> Live Monitor
          </button>
          <button
            onClick={() => onNavigate('policy')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            Edit Policies <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-sm">
          Failed to fetch metrics: {error} (Check if Proxy is running and your Admin API Key in Settings is correct)
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Requests</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Activity className="w-5 h-5" /></div>
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-100">
            {metrics ? metrics.totalRequests.toLocaleString() : '0'}
          </div>
          <p className="mt-1 text-xs text-slate-400">All inbound LLM calls</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Blocked Secrets</span>
            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg"><ShieldAlert className="w-5 h-5" /></div>
          </div>
          <div className="mt-3 text-3xl font-bold text-red-400">
            {metrics ? metrics.blockedRequests.toLocaleString() : '0'}
          </div>
          <p className="mt-1 text-xs text-slate-400">Threats prevented at edge</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tokens Generated</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><KeyRound className="w-5 h-5" /></div>
          </div>
          <div className="mt-3 text-3xl font-bold text-emerald-400">
            {metrics ? metrics.tokensGenerated.toLocaleString() : '0'}
          </div>
          <p className="mt-1 text-xs text-slate-400">PII entities anonymized</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Streams</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg"><Activity className="w-5 h-5" /></div>
          </div>
          <div className="mt-3 text-3xl font-bold text-purple-400">
            {metrics ? metrics.activeStreams : '0'}
          </div>
          <p className="mt-1 text-xs text-slate-400">Concurrent SSE sessions</p>
        </div>
      </div>

      {/* Services Status & Latency Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Component Health */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl">
          <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" /> Component Health
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <Server className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-slate-200">Fastify Core Proxy</span>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Online
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-slate-200">Presidio NLP Engine</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                metrics?.status.presidio === 'healthy'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              }`}>
                {metrics?.status.presidio === 'healthy' ? 'Online' : 'Fallback Engine'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-slate-200">Redis Token Vault</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                metrics?.status.redis === 'healthy'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              }`}>
                {metrics?.status.redis === 'healthy' ? 'Redis 7' : 'Memory Fallback'}
              </span>
            </div>
          </div>
        </div>

        {/* Latency Metrics */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl">
          <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Average Latencies
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Presidio NLP Analysis</span>
                <span className="font-mono text-slate-200">{metrics?.presidioLatencyMs || 0} ms</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, ((metrics?.presidioLatencyMs || 0) / 100) * 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Token Vault (Get / Restore)</span>
                <span className="font-mono text-slate-200">{metrics?.vaultLatencyMs || 2} ms</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '4%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Total Proxy Overhead</span>
                <span className="font-mono text-slate-200">{metrics?.proxyLatencyMs || 3} ms</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '8%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Detected Entities Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl">
          <h2 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" /> Entities Sanitized
          </h2>
          {metrics && Object.keys(metrics.entityBreakdown).length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {Object.entries(metrics.entityBreakdown).map(([entity, count]) => (
                <div key={entity} className="flex items-center justify-between text-xs p-2 bg-slate-800/40 rounded border border-slate-800">
                  <span className="font-mono text-blue-400">{entity}</span>
                  <span className="font-semibold text-slate-200">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-36 flex flex-col items-center justify-center text-slate-500 text-xs text-center">
              <Shield className="w-8 h-8 mb-2 opacity-40" />
              <span>No entities detected yet.</span>
              <span className="mt-1 text-[10px] text-slate-600">Send requests through proxy port 8080.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
