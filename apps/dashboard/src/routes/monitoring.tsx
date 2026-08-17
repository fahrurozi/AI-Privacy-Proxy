import React, { useEffect, useState } from 'react';
import { MetricsSummary } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444'];

export function MonitoringPage() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [history, setHistory] = useState<{ time: string; requests: number; blocked: number }[]>([]);
  const [isLive, setIsLive] = useState(true);

  const loadData = async () => {
    try {
      const data = await fetchApi<MetricsSummary>('/admin/metrics');
      setMetrics(data);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setHistory((prev) => [...prev.slice(-14), { time: timeStr, requests: data.totalRequests, blocked: data.blockedRequests }]);
    } catch {}
  };

  useEffect(() => {
    loadData();
    if (!isLive) return;
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [isLive]);

  const pieData = metrics
    ? Object.entries(metrics.entityBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Live Traffic & Performance</h1>
          <p className="text-sm text-slate-400">Real-time metrics, entity distribution, and latency indicators.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              isLive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {isLive ? 'Live Updates (3s)' : 'Paused'}
          </button>
          <button
            onClick={loadData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Latency & Throughput Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-medium">NLP Latency</div>
            <div className="text-2xl font-bold text-slate-100">{metrics?.presidioLatencyMs || 0} ms</div>
            <div className="text-[11px] text-slate-500">Presidio Entity Detection</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-medium">Vault Overhead</div>
            <div className="text-2xl font-bold text-slate-100">{metrics?.vaultLatencyMs || 2} ms</div>
            <div className="text-[11px] text-slate-500">Redis Ephemeral Session Lookup</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-medium">Active SSE Streams</div>
            <div className="text-2xl font-bold text-slate-100">{metrics?.activeStreams || 0}</div>
            <div className="text-[11px] text-slate-500">Non-blocking incremental chunks</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Timeline */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <h2 className="text-base font-semibold text-slate-100 mb-4">Requests Activity Timeline</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Bar dataKey="requests" name="Total Requests" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="blocked" name="Blocked Threats" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Entity Distribution */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <h2 className="text-base font-semibold text-slate-100 mb-4">PII & Secret Entity Distribution</h2>
          {pieData.length > 0 ? (
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm">
              <Activity className="w-8 h-8 mb-2 opacity-30" />
              <span>No entity distribution data yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
