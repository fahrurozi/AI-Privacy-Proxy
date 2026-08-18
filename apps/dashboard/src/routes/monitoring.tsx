import React, { useEffect, useState, useRef } from 'react';
import { MetricsSummary } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { useTheme } from '../lib/theme.js';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Activity, ShieldCheck, Zap, RefreshCw, Calendar, X } from 'lucide-react';

const M3_PALETTE = ['#1a5cff', '#00897b', '#7c3aed', '#f59e0b', '#dc2626', '#0284c7', '#ec4899'];

export function MonitoringPage() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [history, setHistory] = useState<{ time: string; requests: number; blocked: number }[]>([]);
  const [isLive, setIsLive] = useState(true);
  const { theme } = useTheme();

  // Date Filter State
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Track previous cumulative counts to compute deltas per interval
  const lastCountsRef = useRef<{ totalRequests: number; blockedRequests: number } | null>(null);

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

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      let deltaRequests = 0;
      let deltaBlocked = 0;

      if (lastCountsRef.current !== null) {
        // Delta between current poll and previous poll
        deltaRequests = Math.max(0, data.totalRequests - lastCountsRef.current.totalRequests);
        deltaBlocked = Math.max(0, data.blockedRequests - lastCountsRef.current.blockedRequests);
      }

      // Update reference for next poll
      lastCountsRef.current = {
        totalRequests: data.totalRequests,
        blockedRequests: data.blockedRequests,
      };

      setHistory((prev) => [
        ...prev.slice(-14),
        { time: timeStr, requests: deltaRequests, blocked: deltaBlocked },
      ]);
    } catch {}
  };

  useEffect(() => {
    loadData();
    if (!isLive) return;
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [isLive, dateRangePreset, startDate, endDate]);

  const handleResetDateFilter = () => {
    setDateRangePreset('all');
    setStartDate('');
    setEndDate('');
  };

  const pieData = metrics
    ? Object.entries(metrics.entityBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  const tooltipBg = theme === 'dark' ? '#151c2c' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#304062' : '#d8dee6';
  const tooltipText = theme === 'dark' ? '#f1f5f9' : '#191c20';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Material 3 Top Headline Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
            Live Traffic & Performance
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Real-time telemetry, entity token distribution, and latency indicators.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-m3-full text-xs font-semibold transition-all shadow-m3-1 ${
              isLive
                ? 'bg-secondary-container text-secondary-on-container'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-secondary animate-pulse' : 'bg-outline'}`} />
            {isLive ? 'Live Updates (3s)' : 'Paused'}
          </button>
          <button
            onClick={loadData}
            className="p-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-m3-full border border-outline-variant/50 transition shadow-m3-1"
            title="Refresh metrics now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-surface-container-low border border-outline-variant/60 p-4 sm:p-5 rounded-m3-xl shadow-m3-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
          <Calendar className="w-4 h-4 text-primary" />
          <span>Telemetry Filter:</span>
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

      {/* Latency & Throughput M3 Stat Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-surface-container-low border border-outline-variant/60 p-5 rounded-m3-xl shadow-m3-1 flex items-center gap-4">
          <div className="w-12 h-12 rounded-m3-full bg-primary-container text-primary-on-container flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-on-surface-variant uppercase font-semibold">NLP Latency</div>
            <div className="text-2xl font-extrabold text-on-surface">{metrics?.presidioLatencyMs || 0} ms</div>
            <div className="text-[11px] text-on-surface-variant/80">Presidio Entity Detection</div>
          </div>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/60 p-5 rounded-m3-xl shadow-m3-1 flex items-center gap-4">
          <div className="w-12 h-12 rounded-m3-full bg-secondary-container text-secondary-on-container flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-on-surface-variant uppercase font-semibold">Vault Overhead</div>
            <div className="text-2xl font-extrabold text-on-surface">{metrics?.vaultLatencyMs || 2} ms</div>
            <div className="text-[11px] text-on-surface-variant/80">Redis Ephemeral Session Lookup</div>
          </div>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/60 p-5 rounded-m3-xl shadow-m3-1 flex items-center gap-4">
          <div className="w-12 h-12 rounded-m3-full bg-tertiary-container text-tertiary-on-container flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-on-surface-variant uppercase font-semibold">Active SSE Streams</div>
            <div className="text-2xl font-extrabold text-on-surface">{metrics?.activeStreams || 0}</div>
            <div className="text-[11px] text-on-surface-variant/80">Non-blocking incremental chunks</div>
          </div>
        </div>
      </div>

      {/* Material 3 Chart Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Timeline (Line/Area Chart) */}
        <div className="bg-surface-container-low border border-outline-variant/60 p-6 rounded-m3-xl shadow-m3-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-on-surface">Requests Activity Timeline</h2>
            <span className="text-[11px] font-mono text-on-surface-variant font-medium">Throughput (per 3s poll)</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="reqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a5cff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#1a5cff" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="blockGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke={theme === 'dark' ? '#94a3b8' : '#535b64'} fontSize={11} />
                <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#535b64'} fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '12px',
                    color: tooltipText,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="requests"
                  name="New Requests"
                  stroke="#1a5cff"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#reqGradient)"
                  dot={{ r: 3, fill: '#1a5cff' }}
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="blocked"
                  name="New Blocked"
                  stroke="#dc2626"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#blockGradient)"
                  dot={{ r: 3, fill: '#dc2626' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Entity Distribution */}
        <div className="bg-surface-container-low border border-outline-variant/60 p-6 rounded-m3-xl shadow-m3-1 space-y-4">
          <h2 className="text-sm font-bold text-on-surface">PII & Secret Entity Distribution</h2>
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
                      <Cell key={`cell-${index}`} fill={M3_PALETTE[index % M3_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '12px',
                      color: tooltipText,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-on-surface-variant text-xs">
              <Activity className="w-8 h-8 mb-2 opacity-30" />
              <span className="font-medium">No entity distribution data for this timeframe</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
