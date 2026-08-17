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
  FlaskConical,
  Key,
  Send,
  Loader2,
  RefreshCw,
  Sparkles,
  Shield,
  Eye,
  EyeOff,
  Pencil,
  Lock,
  Cpu,
} from 'lucide-react';

export function ProvidersPage() {
  const [providers, setProviders] = useState<UpstreamProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Copy feedback state per provider ID
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Setup Guide Drawer state
  const [selectedProviderForGuide, setSelectedProviderForGuide] = useState<UpstreamProvider | null>(null);

  // Edit Provider Drawer state
  const [selectedProviderForEdit, setSelectedProviderForEdit] = useState<UpstreamProvider | null>(null);
  const [editName, setEditName] = useState('');
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Playground Drawer State
  const [selectedProviderForPlayground, setSelectedProviderForPlayground] = useState<UpstreamProvider | null>(null);
  const [ephemeralKey, setEphemeralKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; message: string; latencyMs?: number } | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [customModelInput, setCustomModelInput] = useState('');

  // Playground prompt & execution state
  const [playgroundPrompt, setPlaygroundPrompt] = useState(
    'Please summarize this audit record: Customer Alice Walker (alice@techcorp.com) authorized a payment transfer of 2.5 ETH to 0x71C8F794B32145429631994304244a1234567890. Please CC satoshi@bitcoin.org.'
  );
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [playgroundResponse, setPlaygroundResponse] = useState<{
    text: string;
    sanitizedPrompt?: string;
    rawUpstreamResponse?: string;
    latencyMs: number;
    tokensUsed?: number;
    status: number;
  } | null>(null);
  const [activePlaygroundTab, setActivePlaygroundTab] = useState<'client' | 'sent_external' | 'raw_external'>('client');
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);

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

  const handleOpenPlayground = (provider: UpstreamProvider) => {
    setSelectedProviderForPlayground(provider);
    setEphemeralKey('');
    setShowKey(false);
    setTestingConnection(false);
    setConnectionStatus(null);
    setAvailableModels([]);
    setSelectedModel('');
    setCustomModelInput('');
    setPlaygroundResponse(null);
    setPlaygroundError(null);
  };

  const handleOpenEdit = (provider: UpstreamProvider) => {
    setSelectedProviderForEdit(provider);
    setEditName(provider.name);
    setEditBaseUrl(provider.baseUrl);
    setEditDesc(provider.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderForEdit || !editName.trim() || !editBaseUrl.trim()) return;

    const formattedUrl = editBaseUrl.trim().replace(/\/+$/, '');

    try {
      setIsSavingEdit(true);
      const res = await fetchApi<{ status: string; provider: UpstreamProvider; settings: UpstreamSettings }>(
        `/admin/providers/${selectedProviderForEdit.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: editName.trim(),
            baseUrl: formattedUrl,
            description: editDesc.trim() || undefined,
          }),
        }
      );

      setProviders(res.settings.providers);
      setSelectedProviderForEdit(null);
      setStatusMessage({ text: `Provider "${editName}" updated successfully!`, type: 'success' });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to update provider: ${err.message}`, type: 'error' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedProviderForPlayground || !ephemeralKey.trim()) {
      setPlaygroundError('Please enter an API Secret Key to test the connection.');
      return;
    }

    try {
      setTestingConnection(true);
      setPlaygroundError(null);
      setConnectionStatus(null);

      const startTime = Date.now();
      const endpoint = `/p/${selectedProviderForPlayground.id}/v1/models`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ephemeralKey.trim()}`,
          'x-api-key': ephemeralKey.trim(),
        },
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication Failed (HTTP ${response.status}): Invalid API Key.`);
        }
        throw new Error(`Router returned HTTP ${response.status}`);
      }

      const rawText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {}
        }
      } catch {
        data = {};
      }

      let modelsList: string[] = [];

      if (Array.isArray(data?.data)) {
        modelsList = data.data.map((m: any) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
      } else if (Array.isArray(data?.models)) {
        modelsList = data.models.map((m: any) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
      } else if (Array.isArray(data)) {
        modelsList = data.map((m: any) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
      }

      modelsList = Array.from(new Set(modelsList)).sort();

      if (modelsList.length > 0) {
        setAvailableModels(modelsList);
        setSelectedModel(modelsList[0]!);
        setConnectionStatus({
          connected: true,
          message: `Connected successfully! Discovered ${modelsList.length} models on this router (${latency}ms).`,
          latencyMs: latency,
        });
      } else {
        setAvailableModels([]);
        setSelectedModel('custom');
        setConnectionStatus({
          connected: true,
          message: `Connected (${latency}ms), but no model list was returned by this router. Enter custom model ID below.`,
          latencyMs: latency,
        });
      }
    } catch (err: any) {
      setAvailableModels([]);
      setSelectedModel('custom');
      setConnectionStatus({
        connected: false,
        message: `${err.message || 'Connection test failed'}. You can still enter a model ID and test below.`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendPlaygroundRequest = async () => {
    if (!selectedProviderForPlayground) return;
    if (!ephemeralKey.trim()) {
      setPlaygroundError('Secret Key is required to send requests.');
      return;
    }

    const modelToUse = (availableModels.length === 0 || selectedModel === 'custom')
      ? customModelInput.trim()
      : (selectedModel || customModelInput.trim() || 'gpt-4o');

    if (!modelToUse) {
      setPlaygroundError('Please specify a model ID.');
      return;
    }

    try {
      setIsSendingRequest(true);
      setPlaygroundError(null);
      setPlaygroundResponse(null);

      const startTime = Date.now();
      const endpoint = `/p/${selectedProviderForPlayground.id}/v1/chat/completions`;

      const payload = {
        model: modelToUse,
        messages: [
          { role: 'system', content: 'You are a helpful and accurate assistant.' },
          { role: 'user', content: playgroundPrompt },
        ],
        stream: false,
      };

      let simSanitizedText = '';
      try {
        const simRes = await fetchApi<{ transformedText: string }>('/admin/policy/simulate', {
          method: 'POST',
          body: JSON.stringify({ text: playgroundPrompt }),
        });
        simSanitizedText = simRes.transformedText;
      } catch {}

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ephemeralKey.trim()}`,
          'x-api-key': ephemeralKey.trim(),
          'x-privacy-debug': 'true',
        },
        body: JSON.stringify(payload),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = `Upstream error HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          errMsg = parsed.error?.message || parsed.message || errorText;
        } catch {}
        throw new Error(errMsg);
      }

      let sanitizedPrompt = simSanitizedText;
      let rawUpstreamResponse = '';

      const sanitizedHeader = response.headers.get('x-privacy-sanitized-body');
      if (sanitizedHeader) {
        try {
          const decoded = atob(sanitizedHeader);
          const parsed = JSON.parse(decoded);
          sanitizedPrompt = parsed.messages?.[parsed.messages.length - 1]?.content || parsed.prompt || decoded;
        } catch {}
      }

      const rawUpstreamHeader = response.headers.get('x-privacy-raw-upstream-body');
      if (rawUpstreamHeader) {
        try {
          const decoded = atob(rawUpstreamHeader);
          const parsed = JSON.parse(decoded);
          rawUpstreamResponse = parsed.choices?.[0]?.message?.content || parsed.content?.[0]?.text || decoded;
        } catch {}
      }

      const contentType = response.headers.get('content-type') || '';
      let assistantText = '';
      let tokensUsed: number | undefined;

      if (contentType.includes('text/event-stream')) {
        const text = await response.text();
        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const chunk = JSON.parse(trimmed.slice(6));
              const delta =
                chunk.choices?.[0]?.delta?.content ||
                chunk.choices?.[0]?.text ||
                chunk.delta?.text ||
                '';
              assistantText += delta;
              if (chunk.usage?.total_tokens) {
                tokensUsed = chunk.usage.total_tokens;
              }
            } catch {}
          }
        }
        if (!assistantText.trim()) {
          assistantText = text;
        }
      } else {
        const rawText = await response.text();
        try {
          const data = JSON.parse(rawText);
          assistantText =
            data.choices?.[0]?.message?.content ||
            data.content?.[0]?.text ||
            (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
          tokensUsed = data.usage?.total_tokens;
        } catch {
          assistantText = rawText;
        }
      }

      if (!rawUpstreamResponse) {
        rawUpstreamResponse = assistantText;
      }

      setPlaygroundResponse({
        text: assistantText,
        sanitizedPrompt: sanitizedPrompt || playgroundPrompt,
        rawUpstreamResponse: rawUpstreamResponse,
        latencyMs,
        tokensUsed,
        status: response.status,
      });
      setActivePlaygroundTab('client');
    } catch (err: any) {
      setPlaygroundError(err.message || 'Failed to receive response from provider.');
    } finally {
      setIsSendingRequest(false);
    }
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
            Register multiple AI providers and routers. Test endpoints live in the interactive playground or copy proxy URLs.
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
                      <button
                        type="button"
                        onClick={() => handleCopyBaseUrl(p.id)}
                        className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-mono transition text-left ${
                          isCopied
                            ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-950/40'
                            : 'bg-slate-950 hover:bg-slate-900 border-slate-800 hover:border-slate-700 text-emerald-400'
                        }`}
                        title="Click to copy Direct Proxy Endpoint URL"
                      >
                        <span className="truncate max-w-xs sm:max-w-md">{proxyUrl}</span>
                        <span className="shrink-0 text-slate-500 group-hover:text-emerald-300 transition">
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </span>
                        {isCopied && <span className="text-[10px] text-emerald-400 font-sans font-medium shrink-0">Copied!</span>}
                      </button>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1. Interactive Playground Button */}
                        <button
                          onClick={() => handleOpenPlayground(p)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 text-purple-300 border border-purple-500/30 rounded-lg transition text-xs font-semibold shadow-sm"
                          title="Open live playground to test requests with ephemeral secret key"
                        >
                          <FlaskConical className="w-3.5 h-3.5 text-purple-400" /> Playground
                        </button>

                        {/* 2. Edit Provider Button */}
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition text-xs"
                          title="Edit provider settings and base URL"
                        >
                          <Pencil className="w-3.5 h-3.5 text-amber-400" /> Edit
                        </button>

                        {/* 3. Setup Guide Button */}
                        <button
                          onClick={() => setSelectedProviderForGuide(p)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition text-xs"
                          title="View Claude Code, Cursor, and SDK setup instructions"
                        >
                          <Terminal className="w-3.5 h-3.5 text-slate-400" /> Setup
                        </button>

                        {/* 4. Delete Provider */}
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

      {/* 1. SLIDE-OVER DRAWER: Edit Provider */}
      <SlideOverDrawer
        isOpen={selectedProviderForEdit !== null}
        onClose={() => setSelectedProviderForEdit(null)}
        title={selectedProviderForEdit ? `Edit Provider: ${selectedProviderForEdit.name}` : ''}
        subtitle="Update provider display name, target base URL, and description"
        widthClass="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedProviderForEdit(null)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editName.trim() || !editBaseUrl.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        {selectedProviderForEdit && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Provider ID <span className="text-slate-500 font-normal">(Permanent path identifier)</span>
              </label>
              <input
                type="text"
                value={selectedProviderForEdit.id}
                disabled
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono opacity-80 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                Direct URL: {getProxyBaseUrl(selectedProviderForEdit.id)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Upstream Base URL</label>
              <input
                type="url"
                value={editBaseUrl}
                onChange={(e) => setEditBaseUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Example: https://api.openai.com or http://9router.mfahrurozi.my.id/api/v1
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Provider description"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </form>
        )}
      </SlideOverDrawer>

      {/* 2. SLIDE-OVER DRAWER: Live Interactive Provider Playground */}
      <SlideOverDrawer
        isOpen={selectedProviderForPlayground !== null}
        onClose={() => setSelectedProviderForPlayground(null)}
        title={selectedProviderForPlayground ? `Live Playground: ${selectedProviderForPlayground.name}` : ''}
        subtitle="Send real prompts through Privacy Proxy with temporary secret key (discarded on close)"
        widthClass="max-w-2xl"
        footer={
          <button
            onClick={() => setSelectedProviderForPlayground(null)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            Close Playground
          </button>
        }
      >
        {selectedProviderForPlayground && (
          <div className="space-y-5 text-xs text-slate-300 leading-relaxed">
            {/* Ephemeral Key Warning Banner */}
            <div className="p-3.5 bg-blue-950/30 border border-blue-800/40 rounded-xl flex items-start gap-3">
              <Key className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-blue-200 text-xs">Ephemeral In-Memory Secret Key</div>
                <p className="text-[11px] text-slate-400">
                  Your secret key is stored <strong>only in browser memory for this session</strong>. It is never saved to database or localStorage, and is destroyed immediately when you close this window.
                </p>
              </div>
            </div>

            {/* Step 1: Input Ephemeral Key & Test Connection */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-slate-200">
                1. Provider API Secret Key <span className="text-slate-500 font-normal">({selectedProviderForPlayground.name})</span>
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-... or provider authentication token"
                    value={ephemeralKey}
                    onChange={(e) => setEphemeralKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !ephemeralKey.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 shrink-0 shadow-md shadow-blue-600/20"
                >
                  {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>

              {/* Connection Status Indicator */}
              {connectionStatus && (
                <div className={`p-3 rounded-lg text-[11px] flex items-center gap-2 border ${
                  connectionStatus.connected
                    ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                    : 'bg-red-950/40 border-red-800/50 text-red-300'
                }`}>
                  {connectionStatus.connected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{connectionStatus.message}</span>
                </div>
              )}
            </div>

            {/* Step 2: Model Selection (Populated dynamically from router) */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-200">
                  2. Select AI Model
                </label>
                {availableModels.length > 0 ? (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/50">
                    {availableModels.length} models from router
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    Test connection above to load models
                  </span>
                )}
              </div>

              {availableModels.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  >
                    {availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value="custom">-- Enter Custom Model ID --</option>
                  </select>

                  {selectedModel === 'custom' && (
                    <input
                      type="text"
                      placeholder="e.g. meta-llama/llama-3-70b"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Enter model ID (e.g. gpt-4o, claude-3-5-sonnet, deepseek-chat)"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Tip: Click <strong>Test Connection</strong> above to automatically fetch available models from this router.
                  </p>
                </div>
              )}
            </div>

            {/* Step 3: Interactive Prompt Input */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" /> 3. Test Prompt (Contains Sensitive PII)
                </label>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() =>
                      setPlaygroundPrompt(
                        'Create an invoice for Alice Walker (alice@techcorp.com) and transfer 2.5 ETH to 0x71C8F794B32145429631994304244a1234567890. Please confirm to satoshi@bitcoin.org.'
                      )
                    }
                    className="text-blue-400 hover:text-blue-300 px-2 py-0.5 bg-blue-950/60 rounded border border-blue-900/40"
                  >
                    Preset: Financial
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPlaygroundPrompt(
                        'Audit report signed by Dr. Robert Downey for patient John Doe with phone +1-555-0199 and SSN 987-65-4321.'
                      )
                    }
                    className="text-purple-400 hover:text-purple-300 px-2 py-0.5 bg-purple-950/60 rounded border border-purple-900/40"
                  >
                    Preset: Healthcare
                  </button>
                </div>
              </div>

              <textarea
                rows={3}
                value={playgroundPrompt}
                onChange={(e) => setPlaygroundPrompt(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500 resize-y"
                placeholder="Enter prompt containing sensitive data..."
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSendPlaygroundRequest}
                  disabled={isSendingRequest || !ephemeralKey.trim() || !playgroundPrompt.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                >
                  {isSendingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isSendingRequest ? 'Intercepting & Sanitizing...' : 'Send Request via Privacy Proxy'}</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {playgroundError && (
              <div className="p-3.5 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="break-all">{playgroundError}</div>
              </div>
            )}

            {/* Step 4: 3-Stage Privacy Verification Inspector */}
            {playgroundResponse && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 shadow-xl">
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" /> 4. Privacy Inspection & Verification
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900/50">
                      HTTP {playgroundResponse.status} OK
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>⚡ {playgroundResponse.latencyMs}ms</span>
                    {playgroundResponse.tokensUsed && <span>📊 {playgroundResponse.tokensUsed} tokens</span>}
                  </div>
                </div>

                {/* 3-View Tab Switcher */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setActivePlaygroundTab('sent_external')}
                    className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition text-center ${
                      activePlaygroundTab === 'sent_external'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>1. Dikirim ke External</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePlaygroundTab('raw_external')}
                    className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition text-center ${
                      activePlaygroundTab === 'raw_external'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Cpu className="w-3 h-3 shrink-0" />
                    <span>2. Response dari External</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePlaygroundTab('client')}
                    className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition text-center ${
                      activePlaygroundTab === 'client'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>3. Ditampilkan ke Client</span>
                  </button>
                </div>

                {/* Tab 1: Sent to External Router (Sanitized with Tokens) */}
                {activePlaygroundTab === 'sent_external' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-blue-300 font-semibold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-400" /> Sanitized Prompt (Yang Diterima Cloud Router / 9router)
                      </span>
                      <span className="text-[10px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50 font-mono">
                        Surrogate Tokens Only • Zero PII Leak
                      </span>
                    </div>
                    <div className="p-3.5 bg-blue-950/20 border border-blue-900/50 rounded-xl font-mono text-xs text-blue-100 whitespace-pre-wrap leading-relaxed">
                      {playgroundResponse.sanitizedPrompt || playgroundPrompt}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Seluruh identitas asli (nama, email, alamat crypto) telah digantikan dengan token acak sebelum keluar dari server Anda.
                    </p>
                  </div>
                )}

                {/* Tab 2: Raw Response from External Router */}
                {activePlaygroundTab === 'raw_external' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-amber-400" /> Raw Response (Jawaban Mentah yang Dikirim oleh AI)
                      </span>
                      <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/50 font-mono">
                        Tokenized AI Completion
                      </span>
                    </div>
                    <div className="p-3.5 bg-amber-950/20 border border-amber-900/50 rounded-xl font-mono text-xs text-amber-100 whitespace-pre-wrap leading-relaxed">
                      {playgroundResponse.rawUpstreamResponse || playgroundResponse.text}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Model AI memproses dan menyusun jawaban menggunakan token acak tanpa pernah mengetahui data sensitif asli Anda.
                    </p>
                  </div>
                )}

                {/* Tab 3: Final Client Plaintext Result */}
                {activePlaygroundTab === 'client' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Detokenized Result (Hasil Akhir di Client / IDE)
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/50 font-mono">
                        Plaintext Restored Transparently
                      </span>
                    </div>
                    <div className="p-3.5 bg-slate-900 border border-emerald-800/40 rounded-xl font-mono text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                      {playgroundResponse.text}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Privacy Proxy secara transparan memulihkan token kembali ke data asli sebelum diserahkan ke aplikasi/IDE Anda.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>

      {/* 3. SLIDE-OVER DRAWER: Client Setup Guide */}
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

      {/* 4. SLIDE-OVER DRAWER: Add Provider */}
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
