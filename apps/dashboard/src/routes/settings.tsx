import React, { useEffect, useState } from 'react';
import { UpstreamProvider, UpstreamSettings, PrivacyMode } from '@ai-privacy-proxy/shared';
import { fetchApi, getAdminKey, setAdminKey } from '../lib/api.js';
import { SlideOverDrawer } from '../components/SlideOverDrawer.js';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Globe,
  Lock,
  ShieldCheck,
  Plus,
  Trash2,
  Check,
  Clock,
  Code2,
  ZapOff,
  Shield,
  ShieldAlert,
} from 'lucide-react';

export function SettingsPage() {
  const [settings, setSettings] = useState<UpstreamSettings | null>(null);
  const [providers, setProviders] = useState<UpstreamProvider[]>([]);
  const [defaultProviderId, setDefaultProviderId] = useState('default');
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('strict');
  const [ttl, setTtl] = useState(3600);
  const [adminKey, setAdminKeyInput] = useState(getAdminKey());
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add Provider Drawer State
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [newProvName, setNewProvName] = useState('');
  const [newProvId, setNewProvId] = useState('');
  const [newProvUrl, setNewProvUrl] = useState('');
  const [newProvDesc, setNewProvDesc] = useState('');

  const loadSettings = async () => {
    try {
      const data = await fetchApi<UpstreamSettings>('/admin/upstream');
      setSettings(data);
      setProviders(data.providers || []);
      setDefaultProviderId(data.defaultProviderId || 'default');
      setPrivacyMode(data.privacyMode || 'strict');
      setTtl(data.vaultTtlSeconds || 3600);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to load settings: ${err.message}`, type: 'error' });
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSetDefaultProvider = async (providerId: string) => {
    setDefaultProviderId(providerId);
    try {
      await fetchApi('/admin/upstream', {
        method: 'PUT',
        body: JSON.stringify({ defaultProviderId: providerId }),
      });
      setStatusMessage({ text: `Default upstream switched to "${providerId}"!`, type: 'success' });
      loadSettings();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to set default provider: ${err.message}`, type: 'error' });
    }
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvName || !newProvUrl) return;

    const id = (newProvId || newProvName).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const newProv: UpstreamProvider = {
      id,
      name: newProvName.trim(),
      baseUrl: newProvUrl.trim().replace(/\/+$/, ''),
      isDefault: providers.length === 0,
      description: newProvDesc.trim() || undefined,
    };

    try {
      await fetchApi('/admin/providers', {
        method: 'POST',
        body: JSON.stringify(newProv),
      });

      setStatusMessage({ text: `Provider "${newProv.name}" registered successfully!`, type: 'success' });
      setShowAddDrawer(false);
      setNewProvName('');
      setNewProvId('');
      setNewProvUrl('');
      setNewProvDesc('');
      loadSettings();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to add provider: ${err.message}`, type: 'error' });
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!window.confirm(`Delete upstream provider "${id}"?`)) return;
    try {
      await fetchApi(`/admin/providers/${id}`, { method: 'DELETE' });
      setStatusMessage({ text: `Provider "${id}" deleted.`, type: 'success' });
      loadSettings();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to delete provider: ${err.message}`, type: 'error' });
    }
  };

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setAdminKey(adminKey);

      await fetchApi('/admin/upstream', {
        method: 'PUT',
        body: JSON.stringify({
          privacyMode,
          vaultTtlSeconds: ttl,
          defaultProviderId,
        }),
      });

      setStatusMessage({ text: 'Gateway configuration updated successfully in real-time!', type: 'success' });
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
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Gateway Upstream & System Settings</h1>
        <p className="text-sm text-slate-400">
          Manage multi-provider routing, dynamic privacy operating mode, and ephemeral Token Vault TTL without touching .env.
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

      {/* 1. Multi-Provider Management */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" /> Upstream AI Providers
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Register multiple AI providers/routers. Select the default destination or dynamically route per request.
            </p>
          </div>
          <button
            onClick={() => setShowAddDrawer(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition shrink-0 shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" /> Add Provider
          </button>
        </div>

        {/* Providers Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Provider Name & ID</th>
                <th className="px-4 py-3">Base URL</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {providers.map((p) => {
                const isCurrentDefault = p.id === defaultProviderId;
                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-200">{p.name}</div>
                      <div className="font-mono text-[11px] text-blue-400">ID: {p.id}</div>
                      {p.description && <div className="text-[11px] text-slate-500 mt-0.5">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300 break-all">
                      {p.baseUrl}
                    </td>
                    <td className="px-4 py-3">
                      {isCurrentDefault ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3" /> Active Default
                        </span>
                      ) : (
                        <span className="text-slate-500">Available</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isCurrentDefault && (
                          <button
                            onClick={() => handleSetDefaultProvider(p.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                          >
                            Set Default
                          </button>
                        )}
                        {providers.length > 1 && (
                          <button
                            onClick={() => handleDeleteProvider(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition"
                            title="Delete provider"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. System Settings: 3-Way Privacy Operating Mode & Vault TTL */}
      <form onSubmit={handleSaveSystemSettings} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-400" /> Real-time Privacy & Storage Controls
        </h2>

        {/* 3-Way Privacy Mode Cards */}
        <div className="space-y-3 p-5 bg-slate-950 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-semibold text-slate-200">Privacy Operating Mode</label>
              <p className="text-xs text-slate-400 mt-0.5">Select how the gateway handles requests, failovers, and filtering.</p>
            </div>
            <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
              privacyMode === 'strict'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                : privacyMode === 'balanced'
                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
            }`}>
              {privacyMode.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {/* Strict */}
            <div
              onClick={() => setPrivacyMode('strict')}
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                privacyMode === 'strict'
                  ? 'bg-blue-500/10 border-blue-500/50 text-slate-100 ring-1 ring-blue-500/30'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-blue-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> STRICT
                  </span>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    privacyMode === 'strict' ? 'border-blue-400 bg-blue-500' : 'border-slate-600'
                  }`}>
                    {privacyMode === 'strict' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-200 mb-1">Fail-Closed (Recommended)</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  Rejects requests if Presidio or Redis is unavailable to guarantee zero data leakage.
                </div>
              </div>
            </div>

            {/* Balanced */}
            <div
              onClick={() => setPrivacyMode('balanced')}
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                privacyMode === 'balanced'
                  ? 'bg-yellow-500/10 border-yellow-500/50 text-slate-100 ring-1 ring-yellow-500/30'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-yellow-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" /> BALANCED
                  </span>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    privacyMode === 'balanced' ? 'border-yellow-400 bg-yellow-500' : 'border-slate-600'
                  }`}>
                    {privacyMode === 'balanced' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-200 mb-1">Fail-Open with Alerts</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  Falls back to built-in pattern regex engine if Presidio NLP service is offline.
                </div>
              </div>
            </div>

            {/* Bypass */}
            <div
              onClick={() => setPrivacyMode('bypass')}
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                privacyMode === 'bypass'
                  ? 'bg-purple-500/10 border-purple-500/50 text-slate-100 ring-1 ring-purple-500/30'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-purple-400 flex items-center gap-1.5">
                    <ZapOff className="w-4 h-4" /> BYPASS
                  </span>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    privacyMode === 'bypass' ? 'border-purple-400 bg-purple-500' : 'border-slate-600'
                  }`}>
                    {privacyMode === 'bypass' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-200 mb-1">Direct Passthrough</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  Does not perform any PII detection or tokenization. Forwards raw requests directly to upstream.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Token Vault TTL */}
        <div className="space-y-3 p-5 bg-slate-950 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" /> Token Vault TTL
            </label>
            <span className="font-mono text-xs text-purple-400 font-semibold">{formatTtl(ttl)}</span>
          </div>

          <p className="text-xs text-slate-400">
            Lifespan of ephemeral token-to-plaintext mappings in Redis. Automatically purged on expiry.
          </p>

          <div className="space-y-3 pt-2">
            <input
              type="range"
              min={60}
              max={86400}
              step={300}
              value={ttl}
              onChange={(e) => setTtl(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={10}
                max={604800}
                value={ttl}
                onChange={(e) => setTtl(parseInt(e.target.value, 10) || 60)}
                className="w-32 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
              <span className="text-xs text-slate-500">seconds (e.g. 3600 = 1 hr, 86400 = 24 hrs)</span>
            </div>
          </div>
        </div>

        {/* Admin Authentication Key */}
        <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" /> Admin Access Key (X-Admin-Key)
          </label>
          <div className="relative max-w-md">
            <input
              type={showKey ? 'text' : 'password'}
              value={adminKey}
              onChange={(e) => setAdminKeyInput(e.target.value)}
              placeholder="Enter admin secret key"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-20 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
              required
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-1.5 top-1.5 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded transition"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
        >
          <Save className="w-4 h-4" /> {saving ? 'Applying...' : 'Save & Apply All Settings'}
        </button>
      </form>

      {/* 3. RIGHT SLIDE-OVER DRAWER: Add Upstream Provider */}
      <SlideOverDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        title="Register AI Provider / Router"
        subtitle="Configure a new LLM provider or self-hosted router destination"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddDrawer(false)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddProvider}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition shadow-lg shadow-blue-600/20"
            >
              Save Provider
            </button>
          </>
        }
      >
        <form onSubmit={handleAddProvider} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Provider Display Name</label>
            <input
              type="text"
              placeholder="e.g. DeepSeek Official"
              value={newProvName}
              onChange={(e) => {
                setNewProvName(e.target.value);
                if (!newProvId) setNewProvId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Provider ID (for header routing)</label>
            <input
              type="text"
              placeholder="e.g. deepseek"
              value={newProvId}
              onChange={(e) => setNewProvId(e.target.value)}
              className="w-full bg-slate-950 font-mono border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-blue-400 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Base URL</label>
            <input
              type="url"
              placeholder="https://api.deepseek.com"
              value={newProvUrl}
              onChange={(e) => setNewProvUrl(e.target.value)}
              className="w-full bg-slate-950 font-mono border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="e.g. High performance reasoning router"
              value={newProvDesc}
              onChange={(e) => setNewProvDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}
