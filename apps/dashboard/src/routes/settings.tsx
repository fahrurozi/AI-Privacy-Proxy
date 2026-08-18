import React, { useEffect, useState, useRef } from 'react';
import { PrivacyMode, UpstreamSettings } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import {
  Settings,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  Globe,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  HelpCircle,
  Loader2,
  Zap,
} from 'lucide-react';

export function SettingsPage() {
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('balanced');
  const [vaultTtl, setVaultTtl] = useState<number>(3600);
  const [injectHint, setInjectHint] = useState<boolean>(true);
  const [customHint, setCustomHint] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const debounceTimerRef = useRef<any>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<UpstreamSettings>('/admin/upstream');
      setPrivacyMode(data.privacyMode || 'balanced');
      setVaultTtl(data.vaultTtlSeconds || 3600);
      setInjectHint(data.injectPreservationHint !== false);
      setCustomHint(data.customPreservationHint || '');
    } catch (err: any) {
      setStatusMessage({ text: `Failed to load settings: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettingsToServer = async (overrides: {
    privacyMode?: PrivacyMode;
    vaultTtlSeconds?: number;
    injectPreservationHint?: boolean;
    customPreservationHint?: string;
  } = {}) => {
    try {
      setIsSaving(true);
      const payload = {
        privacyMode: overrides.privacyMode ?? privacyMode,
        vaultTtlSeconds: overrides.vaultTtlSeconds ?? vaultTtl,
        injectPreservationHint: overrides.injectPreservationHint ?? injectHint,
        customPreservationHint:
          overrides.customPreservationHint !== undefined
            ? overrides.customPreservationHint.trim() || undefined
            : customHint.trim() || undefined,
      };

      const res = await fetchApi<{ status: string; settings: UpstreamSettings }>('/admin/upstream', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.settings) {
        setPrivacyMode(res.settings.privacyMode);
        setVaultTtl(res.settings.vaultTtlSeconds);
        setInjectHint(res.settings.injectPreservationHint !== false);
        setCustomHint(res.settings.customPreservationHint || '');
      }

      setLastSavedTime(new Date().toLocaleTimeString());
      setStatusMessage(null);
    } catch (err: any) {
      setStatusMessage({ text: `Auto-save failed: ${err.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrivacyModeChange = (mode: PrivacyMode) => {
    setPrivacyMode(mode);
    saveSettingsToServer({ privacyMode: mode });
  };

  const handleToggleHint = () => {
    const nextVal = !injectHint;
    setInjectHint(nextVal);
    saveSettingsToServer({ injectPreservationHint: nextVal });
  };

  const handleTtlChange = (newTtl: number) => {
    setVaultTtl(newTtl);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveSettingsToServer({ vaultTtlSeconds: newTtl });
    }, 400);
  };

  const handleCustomHintChange = (text: string) => {
    setCustomHint(text);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveSettingsToServer({ customPreservationHint: text });
    }, 600);
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
          Configure real-time privacy operating modes, fallback resilience, prompt token preservation directives, and ephemeral Token Vault TTL.
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
      <div className="bg-surface-container-low border border-outline-variant/60 p-6 sm:p-8 rounded-m3-xl space-y-6 shadow-m3-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" /> Real-time Privacy & Storage Controls
          </h2>
          <div className="flex items-center gap-2">
            {isSaving ? (
              <span className="flex items-center gap-1.5 text-xs text-primary font-medium bg-primary-container/60 px-3 py-1 rounded-m3-full animate-pulse border border-primary/30">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving changes...
              </span>
            ) : lastSavedTime ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-m3-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Auto-saved dynamically ({lastSavedTime})
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-on-surface-variant bg-surface-container px-3 py-1 rounded-m3-full border border-outline-variant/40">
                <Zap className="w-3.5 h-3.5 text-secondary" /> Instant Auto-Save Active
              </span>
            )}
          </div>
        </div>

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
              onClick={() => handlePrivacyModeChange('strict')}
              className={`p-5 rounded-m3-lg border text-left flex flex-col justify-between transition-all m3-state-layer cursor-pointer ${
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
              onClick={() => handlePrivacyModeChange('balanced')}
              className={`p-5 rounded-m3-lg border text-left flex flex-col justify-between transition-all m3-state-layer cursor-pointer ${
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
              onClick={() => handlePrivacyModeChange('bypass')}
              className={`p-5 rounded-m3-lg border text-left flex flex-col justify-between transition-all m3-state-layer cursor-pointer ${
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

        {/* Smart Token Preservation System Hint Card */}
        <div className="space-y-4 p-5 sm:p-6 bg-surface-container rounded-m3-lg border border-outline-variant/40">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <label className="text-xs sm:text-sm font-bold text-on-surface">
                  Smart Token Preservation Directive (Just-In-Time)
                </label>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/50">
                  Default: Enabled
                </span>
                <div className="relative group flex items-center">
                  <HelpCircle className="w-4 h-4 text-on-surface-variant/70 group-hover:text-primary transition-colors cursor-help" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col items-center w-72 p-3 bg-surface-container-highest text-on-surface text-[11px] leading-relaxed rounded-m3-md border border-outline-variant/60 shadow-m3-2 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <p className="font-semibold text-primary mb-1">What is this directive?</p>
                    <p className="text-on-surface-variant">
                      When PII is sanitized, the proxy attaches a subtle system rule instructing upstream LLMs to retain bracketed tokens and masked strings exactly as written, preventing hallucinations or token corruption. It incurs zero latency when no PII is detected.
                    </p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-container-highest" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed max-w-2xl">
                Automatically attaches a non-intrusive system directive instructing the upstream LLM to preserve bracketed tokens (<code className="font-mono text-primary">[PREFIX:*]</code>) and masked strings (<code className="font-mono text-secondary">s***i@domain.com</code>, <code className="font-mono text-secondary">0x123...456</code>) verbatim. <strong>Zero overhead:</strong> Only injected when PII tokens are actually generated in the request.
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleHint}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-m3-full text-xs font-semibold border transition cursor-pointer ${
                injectHint
                  ? 'bg-secondary-container text-secondary-on-container border-secondary/30'
                  : 'bg-surface-container-high text-on-surface-variant border-outline-variant/60'
              }`}
            >
              {injectHint ? <ToggleRight className="w-4 h-4 text-secondary" /> : <ToggleLeft className="w-4 h-4" />}
              <span>{injectHint ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>

          {injectHint && (
            <div className="space-y-3 pt-3 border-t border-outline-variant/30 animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Default Directive Sent to LLM
                </label>
                <div className="p-3 bg-surface-container-high rounded-m3-md border border-outline-variant/50 text-xs font-mono text-on-surface leading-relaxed select-all">
                  IMPORTANT: Bracketed tokens like [PREFIX:*] and masked strings (e.g. s***i@domain.com, 0x1234...abcd, ****-1234) are literal variables. Preserve them verbatim in your response without modifying, guessing, or replacing them.
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Custom Directive Override (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter custom prompt directive to override the default above..."
                  value={customHint}
                  onChange={(e) => handleCustomHintChange(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/60 rounded-m3-md px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:border-primary font-mono resize-none"
                />
                <p className="text-[11px] text-on-surface-variant/80">
                  Leave empty to use the default directive shown above.
                </p>
              </div>
            </div>
          )}
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
            onChange={(e) => handleTtlChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-surface-container-highest rounded-m3-full appearance-none cursor-pointer accent-primary"
          />

          <div className="flex justify-between text-[11px] text-on-surface-variant font-mono">
            <span>1 min (60s)</span>
            <span>1 hour (3600s)</span>
            <span>24 hours (86400s)</span>
          </div>
        </div>

        {/* Auto-Save Status Footer Banner */}
        <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-m3-lg border border-outline-variant/30 text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span>All system changes are applied dynamically in real-time without restarting proxy services.</span>
          </div>
          {lastSavedTime && (
            <span className="font-mono text-[11px] text-emerald-400">
              Synced: {lastSavedTime}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
