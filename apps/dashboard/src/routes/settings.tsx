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
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
          Gateway System Settings
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
          Configure real-time privacy operating modes, fallback resilience, and ephemeral Token Vault TTL.
        </p>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-m3-lg flex items-center gap-3 text-xs font-semibold border ${
          statusMessage.type === 'success'
            ? 'bg-secondary-container text-secondary-on-container border-secondary/30'
            : 'bg-error-container text-error-on-container border-error/30'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {statusMessage.text}
        </div>
      )}

      {/* System Settings Form: Material 3 Elevated Card */}
      <form onSubmit={handleSaveSystemSettings} className="bg-surface-container-low border border-outline-variant/60 p-6 sm:p-8 rounded-m3-xl space-y-6 shadow-m3-1">
        <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" /> Real-time Privacy & Storage Controls
        </h2>

        {/* 3-Way Privacy Mode Cards */}
        <div className="space-y-3 p-5 sm:p-6 bg-surface-container rounded-m3-lg border border-outline-variant/40">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs sm:text-sm font-bold text-on-surface">Privacy Operating Mode</label>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Controls fail-closed vs fail-open fallback behavior across the proxy engine.
              </p>
            </div>
            <span className="font-mono text-xs text-primary font-bold uppercase px-3 py-1 bg-primary-container text-primary-on-container rounded-m3-full">
              {privacyMode}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
            {/* STRICT */}
            <button
              type="button"
              onClick={() => setPrivacyMode('strict')}
              className={`p-5 rounded-m3-lg border text-left flex flex-col justify-between transition-all m3-state-layer ${
                privacyMode === 'strict'
                  ? 'bg-primary-container/40 border-primary text-on-surface shadow-m3-1 ring-1 ring-primary/40'
                  : 'bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs sm:text-sm text-on-surface flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-error" /> Strict (Fail-Closed)
                </span>
                {privacyMode === 'strict' && <Check className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Rejects requests if Presidio NLP or Redis Vault is offline to guarantee <strong>zero data leakage</strong>.
              </p>
            </button>

            {/* BALANCED */}
            <button
              type="button"
              onClick={() => setPrivacyMode('balanced')}
              className={`p-5 rounded-m3-lg border text-left flex flex-col justify-between transition-all m3-state-layer ${
                privacyMode === 'balanced'
                  ? 'bg-secondary-container/40 border-secondary text-on-surface shadow-m3-1 ring-1 ring-secondary/40'
                  : 'bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs sm:text-sm text-on-surface flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-secondary" /> Balanced (Fail-Open)
                </span>
                {privacyMode === 'balanced' && <Check className="w-4 h-4 text-secondary" />}
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Seamlessly falls back to the internal pattern engine if Presidio NLP is unreachable.
              </p>
            </button>

            {/* BYPASS */}
            <button
              type="button"
              onClick={() => setPrivacyMode('bypass')}
              className={`p-5 rounded-m3-lg border text-left flex flex-col justify-between transition-all m3-state-layer ${
                privacyMode === 'bypass'
                  ? 'bg-tertiary-container/40 border-tertiary text-on-surface shadow-m3-1 ring-1 ring-tertiary/40'
                  : 'bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs sm:text-sm text-on-surface flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-tertiary" /> Bypass (Passthrough)
                </span>
                {privacyMode === 'bypass' && <Check className="w-4 h-4 text-tertiary" />}
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Forwards requests raw without PII detection or tokenization. Zero latency overhead.
              </p>
            </button>
          </div>
        </div>

        {/* Vault TTL Slider */}
        <div className="space-y-3 p-5 sm:p-6 bg-surface-container rounded-m3-lg border border-outline-variant/40">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> Ephemeral Token Vault TTL
              </label>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Duration after which tokenized mappings are automatically purged from Redis.
              </p>
            </div>
            <span className="font-mono text-xs text-primary-on-container font-bold bg-primary-container px-3 py-1 rounded-m3-full">
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
            className="w-full h-2 bg-surface-container-highest rounded-m3-full appearance-none cursor-pointer accent-primary"
          />

          <div className="flex justify-between text-[11px] text-on-surface-variant font-mono">
            <span>1 min (60s)</span>
            <span>1 hour (3600s)</span>
            <span>24 hours (86400s)</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-on text-xs font-semibold rounded-m3-full shadow-m3-1 hover:shadow-m3-2 transition-all disabled:opacity-50 m3-state-layer"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
