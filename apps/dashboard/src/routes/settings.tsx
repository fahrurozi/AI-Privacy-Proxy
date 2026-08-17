import React, { useEffect, useState } from 'react';
import { PrivacyMode, UpstreamSettings } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import {
  Settings,
  Check,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  Globe,
} from 'lucide-react';

export function SettingsPage() {
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('balanced');
  const [vaultTtl, setVaultTtl] = useState<number>(3600);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<UpstreamSettings>('/admin/upstream');
      setPrivacyMode(data.privacyMode || 'balanced');
      setVaultTtl(data.vaultTtlSeconds || 3600);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to load settings: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetchApi<{ status: string; settings: UpstreamSettings }>('/admin/upstream', {
        method: 'PUT',
        body: JSON.stringify({
          privacyMode,
          vaultTtlSeconds: vaultTtl,
        }),
      });

      setPrivacyMode(res.settings.privacyMode);
      setVaultTtl(res.settings.vaultTtlSeconds);
      setStatusMessage({ text: 'System settings saved and applied dynamically in real-time!', type: 'success' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to update settings: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const formatTtl = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes (${seconds}s)`;
    const hours = (seconds / 3600).toFixed(1).replace('.0', '');
    return `${hours} hours (${seconds}s)`;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Gateway System Settings</h1>
        <p className="text-sm text-slate-400">
          Configure real-time privacy operating modes, fallback resilience, and ephemeral Token Vault TTL.
        </p>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm border ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
            : 'bg-red-950/40 border-red-800/50 text-red-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          {statusMessage.text}
        </div>
      )}

      {/* System Settings Form: 3-Way Privacy Operating Mode & Vault TTL */}
      <form onSubmit={handleSaveSystemSettings} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6 shadow-lg">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-400" /> Real-time Privacy & Storage Controls
        </h2>

        {/* 3-Way Privacy Mode Cards */}
        <div className="space-y-3 p-5 bg-slate-950 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-200">Privacy Operating Mode</label>
              <p className="text-xs text-slate-400 mt-0.5">
                Controls fail-closed vs fail-open fallback behavior across the proxy engine.
              </p>
            </div>
            <span className="font-mono text-xs text-blue-400 uppercase font-semibold px-2 py-0.5 bg-blue-950 rounded border border-blue-900/50">
              {privacyMode}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {/* STRICT */}
            <button
              type="button"
              onClick={() => setPrivacyMode('strict')}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition ${
                privacyMode === 'strict'
                  ? 'bg-blue-600/15 border-blue-500 text-blue-300 ring-1 ring-blue-500/30'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-red-400" /> Strict (Fail-Closed)
                </span>
                {privacyMode === 'strict' && <Check className="w-4 h-4 text-blue-400" />}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Rejects requests if Presidio NLP or Redis Vault is offline to guarantee <strong>zero data leakage</strong>.
              </p>
            </button>

            {/* BALANCED */}
            <button
              type="button"
              onClick={() => setPrivacyMode('balanced')}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition ${
                privacyMode === 'balanced'
                  ? 'bg-emerald-600/15 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" /> Balanced (Fail-Open)
                </span>
                {privacyMode === 'balanced' && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Seamlessly falls back to the internal pattern engine if Presidio NLP is unreachable.
              </p>
            </button>

            {/* BYPASS */}
            <button
              type="button"
              onClick={() => setPrivacyMode('bypass')}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition ${
                privacyMode === 'bypass'
                  ? 'bg-purple-600/15 border-purple-500 text-purple-300 ring-1 ring-purple-500/30'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-purple-400" /> Bypass (Passthrough)
                </span>
                {privacyMode === 'bypass' && <Check className="w-4 h-4 text-purple-400" />}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Forwards requests raw without PII detection or tokenization. Zero latency overhead.
              </p>
            </button>
          </div>
        </div>

        {/* Vault TTL Slider */}
        <div className="space-y-3 p-5 bg-slate-950 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-400" /> Ephemeral Token Vault TTL
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Duration after which tokenized mappings are automatically purged from Redis.
              </p>
            </div>
            <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/50">
              {formatTtl(vaultTtl)}
            </span>
          </div>

          <input
            type="range"
            min="60"
            max="86400"
            step="60"
            value={vaultTtl}
            onChange={(e) => setVaultTtl(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>1 min (60s)</span>
            <span>1 hour (3600s)</span>
            <span>24 hours (86400s)</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
