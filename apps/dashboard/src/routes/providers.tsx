import React, { useEffect, useState } from 'react';
import { UpstreamProvider, UpstreamSettings } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { SlideOverDrawer } from '../components/SlideOverDrawer.js';
import {
  Globe,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  AlertCircle,
  Copy,
  Terminal,
  Code2,
  Sparkles,
} from 'lucide-react';

export function ProvidersPage() {
  const [providers, setProviders] = useState<UpstreamProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Copy feedback state per provider ID
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Integration Drawer state
  const [selectedProviderForGuide, setSelectedProviderForGuide] = useState<UpstreamProvider | null>(null);

  // Add Provider Drawer State
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<UpstreamSettings>('/admin/upstream');
      setProviders(data.providers || []);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to load providers: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const getProxyBaseUrl = (providerId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${origin}/p/${providerId}/v1`;
  };

  const getClaudeBaseUrl = (providerId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${origin}/p/${providerId}`;
  };

  const handleCopyBaseUrl = (providerId: string) => {
    const url = getProxyBaseUrl(providerId);
    navigator.clipboard.writeText(url);
    setCopiedId(providerId);
    setStatusMessage({ text: `Proxy Base URL for "${providerId}" copied to clipboard!`, type: 'success' });
    setTimeout(() => setCopiedId(null), 2500);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newName.trim() || !newBaseUrl.trim()) return;

    const formattedId = newId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const formattedUrl = newBaseUrl.trim().replace(/\/+$/, '');

    try {
      const res = await fetchApi<{ status: string; settings: UpstreamSettings }>('/admin/providers', {
        method: 'POST',
        body: JSON.stringify({
          id: formattedId,
          name: newName.trim(),
          baseUrl: formattedUrl,
          isDefault: false,
          description: newDesc.trim() || undefined,
        }),
      });

      setProviders(res.settings.providers);
      setShowAddDrawer(false);
      setNewId('');
      setNewName('');
      setNewBaseUrl('');
      setNewDesc('');
      setStatusMessage({ text: `Provider "${newName}" registered successfully!`, type: 'success' });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to add provider: ${err.message}`, type: 'error' });
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (providers.length <= 1) {
      setStatusMessage({ text: 'Cannot delete the only configured provider.', type: 'error' });
      return;
    }

    if (!window.confirm(`Are you sure you want to remove the provider "${id}"?`)) return;

    try {
      const res = await fetchApi<{ status: string; settings: UpstreamSettings }>(`/admin/providers/${id}`, {
        method: 'DELETE',
      });
      setProviders(res.settings.providers);
      setStatusMessage({ text: `Provider "${id}" deleted.`, type: 'success' });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to delete provider: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Upstream AI Providers</h1>
          <p className="text-sm text-slate-400">
            Register multiple AI providers and routers. Copy direct proxy endpoints for Claude Code, Cursor, and SDKs.
          </p>
        </div>
        <button
          onClick={() => setShowAddDrawer(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition shrink-0 shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" /> Add Provider
        </button>
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

      {/* Providers Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
            <Globe className="w-4 h-4 text-blue-400" /> Registered Providers & Proxy Endpoints
          </div>
          <span className="text-xs text-slate-400 font-mono">Total: {providers.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Provider Name & Target</th>
                <th className="px-5 py-3.5">Direct Proxy Endpoint</th>
                <th className="px-5 py-3.5 text-right">Client Setup & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
              {providers.map((p) => {
                const isCopied = copiedId === p.id;
                const proxyUrl = getProxyBaseUrl(p.id);

                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className="font-mono text-[10px] text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
                          id: {p.id}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs mt-1" title={p.baseUrl}>
                        Target: {p.baseUrl}
                      </div>
                      {p.description && <div className="text-[11px] text-slate-500 mt-0.5">{p.description}</div>}
                    </td>

                    <td className="px-5 py-4 font-mono">
                      <div className="flex items-center gap-2">
                        <code className="text-emerald-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px]">
                          {proxyUrl}
                        </code>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1. Copy Base URL Button */}
                        <button
                          onClick={() => handleCopyBaseUrl(p.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            isCopied
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                              : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/40'
                          }`}
                          title="Copy Proxy Base URL for this provider"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                          <span>{isCopied ? 'Copied URL!' : 'Copy Base URL'}</span>
                        </button>

                        {/* 2. Setup Guide Button */}
                        <button
                          onClick={() => setSelectedProviderForGuide(p)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition text-xs"
                          title="View Claude Code, Cursor, and SDK setup instructions"
                        >
                          <Terminal className="w-3.5 h-3.5 text-slate-400" /> Setup
                        </button>

                        {/* 3. Delete Provider */}
                        {providers.length > 1 && (
                          <button
                            onClick={() => handleDeleteProvider(p.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
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

      {/* RIGHT SLIDE-OVER DRAWER: Client Setup Guide */}
      <SlideOverDrawer
        isOpen={selectedProviderForGuide !== null}
        onClose={() => setSelectedProviderForGuide(null)}
        title={selectedProviderForGuide ? `Client Setup: ${selectedProviderForGuide.name}` : ''}
        subtitle="Quick configuration instructions for Claude Code, Cursor, and SDKs"
        widthClass="max-w-xl"
        footer={
          <button
            onClick={() => setSelectedProviderForGuide(null)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            Close
          </button>
        }
      >
        {selectedProviderForGuide && (
          <div className="space-y-5 text-xs text-slate-300 leading-relaxed">
            {/* Claude Code Integration */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-purple-400" /> 1. Claude Code CLI Setup
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`export ANTHROPIC_BASE_URL="${getClaudeBaseUrl(selectedProviderForGuide.id)}"`);
                    setStatusMessage({ text: 'Claude Code export command copied!', type: 'success' });
                    setTimeout(() => setStatusMessage(null), 3000);
                  }}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <p className="text-slate-400 text-[11px]">
                Run this command in your terminal before launching Claude Code:
              </p>
              <div className="p-2.5 bg-slate-900 border border-slate-850 rounded-lg font-mono text-[11px] text-purple-300 break-all">
                export ANTHROPIC_BASE_URL="{getClaudeBaseUrl(selectedProviderForGuide.id)}"
              </div>
            </div>

            {/* OpenAI / 9router / Cursor SDK Integration */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-emerald-400" /> 2. OpenAI SDK / Cursor / Aider
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`export OPENAI_BASE_URL="${getProxyBaseUrl(selectedProviderForGuide.id)}"`);
                    setStatusMessage({ text: 'OpenAI Base URL export command copied!', type: 'success' });
                    setTimeout(() => setStatusMessage(null), 3000);
                  }}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-850 rounded-lg font-mono text-[11px] text-emerald-300 break-all">
                export OPENAI_BASE_URL="{getProxyBaseUrl(selectedProviderForGuide.id)}"
              </div>
            </div>

            {/* Curl Sample */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-blue-400" /> 3. REST API / cURL Request
                </span>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-850 rounded-lg font-mono text-[10px] text-blue-300 leading-relaxed overflow-x-auto">
                curl -X POST "{getProxyBaseUrl(selectedProviderForGuide.id)}/chat/completions" \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer sk-YOUR-KEY" \<br />
                &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                &nbsp;&nbsp;-d '&#123;"model":"gpt-4o","messages":[&#123;"role":"user","content":"Hello"&#125;]&#125;'
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* RIGHT SLIDE-OVER DRAWER: Add Provider */}
      <SlideOverDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        title="Add AI Provider / Router"
        subtitle="Register a new AI upstream endpoint or unified gateway"
        widthClass="max-w-md"
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
              disabled={!newId.trim() || !newName.trim() || !newBaseUrl.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              Register Provider
            </button>
          </>
        }
      >
        <form onSubmit={handleAddProvider} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Provider Unique ID <span className="text-slate-500 font-mono">(Used in URL path)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 9router, deepseek, groq"
              value={newId}
              onChange={(e) => setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-blue-300 font-mono focus:outline-none focus:border-blue-500"
              required
            />
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              Direct URL will be: {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/p/{newId || ':id'}/v1
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
            <input
              type="text"
              placeholder="e.g. 9router Unified Gateway"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Upstream Base URL</label>
            <input
              type="url"
              placeholder="e.g. http://9router.mfahrurozi.my.id/api/v1"
              value={newBaseUrl}
              onChange={(e) => setNewBaseUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Self-hosted 9router AI endpoint"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}
