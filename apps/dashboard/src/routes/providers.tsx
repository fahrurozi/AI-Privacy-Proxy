import React, { useEffect, useState, useRef } from 'react';
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
  Layers,
  Activity,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
} from 'lucide-react';

// ── Color-coded entity type badge ────────────────────────────────────────────
const ENTITY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  PERSON:           { bg: 'bg-blue-950/60',   text: 'text-blue-200',   border: 'border-blue-800',   dot: 'bg-blue-400' },
  EMAIL_ADDRESS:    { bg: 'bg-emerald-950/60', text: 'text-emerald-200', border: 'border-emerald-800', dot: 'bg-emerald-400' },
  PHONE_NUMBER:     { bg: 'bg-teal-950/60',   text: 'text-teal-200',   border: 'border-teal-800',   dot: 'bg-teal-400' },
  IP_ADDRESS:       { bg: 'bg-cyan-950/60',   text: 'text-cyan-200',   border: 'border-cyan-800',   dot: 'bg-cyan-400' },
  ETHEREUM_ADDRESS: { bg: 'bg-purple-950/60', text: 'text-purple-200', border: 'border-purple-800', dot: 'bg-purple-400' },
  SOLANA_ADDRESS:   { bg: 'bg-violet-950/60', text: 'text-violet-200', border: 'border-violet-800', dot: 'bg-violet-400' },
  CREDIT_CARD:      { bg: 'bg-yellow-950/60', text: 'text-yellow-200', border: 'border-yellow-800', dot: 'bg-yellow-400' },
  US_SSN:           { bg: 'bg-orange-950/60', text: 'text-orange-200', border: 'border-orange-800', dot: 'bg-orange-400' },
  API_KEY:          { bg: 'bg-red-950/60',    text: 'text-red-200',    border: 'border-red-800',    dot: 'bg-red-400' },
  PRIVATE_KEY:      { bg: 'bg-red-950/80',    text: 'text-red-100',    border: 'border-red-700',    dot: 'bg-red-300' },
  SEED_PHRASE:      { bg: 'bg-red-950/80',    text: 'text-red-100',    border: 'border-red-700',    dot: 'bg-red-300' },
  ORGANIZATION:     { bg: 'bg-indigo-950/60', text: 'text-indigo-200', border: 'border-indigo-800', dot: 'bg-indigo-400' },
};
const DEFAULT_ENTITY_COLOR = { bg: 'bg-surface-container-high', text: 'text-on-surface', border: 'border-outline-variant/50', dot: 'bg-slate-400' };

function EntityTypeBadge({ type }: { type: string }) {
  const c = ENTITY_COLORS[type] || DEFAULT_ENTITY_COLOR;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {type}
    </span>
  );
}

// ── Color-coded token highlighter in raw AI response ─────────────────────────
function HighlightedTokenText({
  text,
  legend,
}: {
  text: string;
  legend: { token: string; entityType: string; originalValue: string }[];
}) {
  if (!legend || legend.length === 0) return <>{text}</>;

  // Build a map from token string to entityType
  const tokenTypeMap = new Map<string, string>();
  for (const entry of legend) {
    tokenTypeMap.set(entry.token, entry.entityType);
  }

  // Split text into token and non-token segments, then highlight
  const tokenPattern = /(\[[a-zA-Z0-9_-]+:[A-Z_]+_\d{3}\]|\b[A-Z][A-Z_]+_\d{3}\b)/g;
  const parts = text.split(tokenPattern);

  return (
    <>
      {parts.map((part, idx) => {
        const entityType = tokenTypeMap.get(part);
        if (!entityType) {
          // Try bare suffix match
          const bareSuffix = legend.find(
            (e) => e.token.includes(`:${part}]`) || e.token.endsWith(`${part}]`)
          );
          if (bareSuffix) {
            const c = ENTITY_COLORS[bareSuffix.entityType] || DEFAULT_ENTITY_COLOR;
            return (
              <span
                key={idx}
                className={`inline rounded px-1 py-0.5 font-mono text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}
                title={`→ ${bareSuffix.originalValue}`}
              >
                {part}
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        }
        const c = ENTITY_COLORS[entityType] || DEFAULT_ENTITY_COLOR;
        return (
          <span
            key={idx}
            className={`inline rounded px-1 py-0.5 font-mono text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}
            title={`→ ${legend.find((e) => e.token === part)?.originalValue ?? ''}`}
          >
            {part}
          </span>
        );
      })}
    </>
  );
}

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
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelDropdownOpen]);

  // Playground prompt & execution state
  const [playgroundPrompt, setPlaygroundPrompt] = useState(
    'Please summarize this audit record: Customer Alice Walker (alice@techcorp.com) authorized a payment transfer of 2.5 ETH to 0x71C8F794B32145429631994304244a1234567890. Please CC satoshi@bitcoin.org.'
  );
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestElapsedSeconds, setRequestElapsedSeconds] = useState(0);
  const [streamMode, setStreamMode] = useState(true);

  useEffect(() => {
    let interval: any;
    if (isSendingRequest) {
      setRequestElapsedSeconds(0);
      interval = setInterval(() => {
        setRequestElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRequestElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isSendingRequest]);
  const [playgroundResponse, setPlaygroundResponse] = useState<{
    text: string;
    sanitizedPrompt?: string;
    rawUpstreamResponse?: string;
    latencyMs: number;
    tokensUsed?: number;
    status: number;
    sessionId?: string;
    presidioMs?: number;
    llmMs?: number;
    proxyOverheadMs?: number;
  } | null>(null);
  const [tokenLegend, setTokenLegend] = useState<{ token: string; entityType: string; originalValue: string }[]>([]);
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
    setModelSearchQuery('');
    setIsModelDropdownOpen(false);
    setPlaygroundResponse(null);
    setTokenLegend([]);
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
      setTokenLegend([]);

      const startTime = Date.now();
      const isAnthropic = selectedProviderForPlayground.id === 'anthropic' || selectedProviderForPlayground.baseUrl.includes('anthropic.com');
      const endpoint = isAnthropic
        ? `/p/${selectedProviderForPlayground.id}/v1/messages`
        : `/p/${selectedProviderForPlayground.id}/v1/chat/completions`;

      const payload = isAnthropic
        ? {
            model: modelToUse,
            max_tokens: 4096,
            messages: [{ role: 'user', content: playgroundPrompt }],
            stream: streamMode,
          }
        : {
            model: modelToUse,
            messages: [
              { role: 'system', content: 'You are a helpful and accurate assistant.' },
              { role: 'user', content: playgroundPrompt },
            ],
            stream: streamMode,
          };

      let simSanitizedText = '';
      try {
        const simRes = await fetchApi<{ transformedText: string }>('/admin/policy/simulate', {
          method: 'POST',
          body: JSON.stringify({ text: playgroundPrompt }),
        });
        simSanitizedText = simRes.transformedText;
      } catch {}

      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-privacy-debug': 'true',
      };

      if (isAnthropic) {
        reqHeaders['x-api-key'] = ephemeralKey.trim();
        reqHeaders['anthropic-version'] = '2023-06-01';
      } else {
        reqHeaders['Authorization'] = `Bearer ${ephemeralKey.trim()}`;
        if (selectedProviderForPlayground.baseUrl.includes('openrouter.ai')) {
          reqHeaders['HTTP-Referer'] = 'http://localhost:3000';
          reqHeaders['X-Title'] = 'AI Privacy Proxy';
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = `Upstream error HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          errMsg = parsed.error?.message || (typeof parsed.error === 'string' ? parsed.error : null) || parsed.message || errorText;
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

      // Directly extract exact token mappings created for this request
      const tokensMapHeader = response.headers.get('x-privacy-tokens-map');
      let directTokens: { token: string; entityType: string; originalValue: string }[] = [];
      if (tokensMapHeader) {
        try {
          const decoded = atob(tokensMapHeader);
          directTokens = JSON.parse(decoded);
          if (Array.isArray(directTokens) && directTokens.length > 0) {
            setTokenLegend(directTokens);
          }
        } catch {}
      }

      const sessionId = response.headers.get('x-privacy-session-id') || '';
      const contentType = response.headers.get('content-type') || '';
      let assistantText = '';
      let tokensUsed: number | undefined;

      const isEventStream = contentType.includes('text/event-stream') || streamMode;

      if (isEventStream && response.body) {
        // Open the inspector panel immediately so user sees incremental text stream
        setPlaygroundResponse({
          text: '',
          sanitizedPrompt: sanitizedPrompt || playgroundPrompt,
          rawUpstreamResponse: '',
          latencyMs: 0,
          status: response.status,
          sessionId,
        });
        setActivePlaygroundTab('client');

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const textChunk = decoder.decode(value, { stream: true });
          buffer += textChunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;

            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6).trim();
              if (dataStr === '[DONE]') continue;

              try {
                const chunk = JSON.parse(dataStr);
                const delta =
                  chunk.choices?.[0]?.delta?.content ||
                  chunk.choices?.[0]?.text ||
                  chunk.delta?.text ||
                  chunk.content_block?.text ||
                  '';
                if (delta) {
                  assistantText += delta;
                  setPlaygroundResponse((prev) =>
                    prev ? { ...prev, text: assistantText } : null
                  );
                }
                if (chunk.usage?.total_tokens) {
                  tokensUsed = chunk.usage.total_tokens;
                }
              } catch {
                if (dataStr && dataStr !== '[DONE]') {
                  assistantText += dataStr;
                  setPlaygroundResponse((prev) =>
                    prev ? { ...prev, text: assistantText } : null
                  );
                }
              }
            }
          }
        }

        if (buffer.trim().startsWith('data: ')) {
          const dataStr = buffer.trim().slice(6).trim();
          if (dataStr && dataStr !== '[DONE]') {
            try {
              const chunk = JSON.parse(dataStr);
              const delta =
                chunk.choices?.[0]?.delta?.content ||
                chunk.choices?.[0]?.text ||
                chunk.delta?.text ||
                '';
              if (delta) {
                assistantText += delta;
              }
            } catch {}
          }
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

      const totalMs = Date.now() - startTime;
      const presidioMs = parseInt(response.headers.get('x-privacy-presidio-ms') || '0');
      const llmMs = parseInt(response.headers.get('x-privacy-llm-ms') || '0') || totalMs;
      const proxyOverheadMs = parseInt(response.headers.get('x-privacy-proxy-overhead-ms') || '0');

      setPlaygroundResponse({
        text: assistantText,
        sanitizedPrompt: sanitizedPrompt || playgroundPrompt,
        rawUpstreamResponse: rawUpstreamResponse,
        latencyMs: totalMs,
        tokensUsed,
        status: response.status,
        sessionId,
        presidioMs,
        llmMs,
        proxyOverheadMs,
      });

      // Fallback: Fetch token mapping legend from session endpoint if not already loaded from response header
      if (directTokens.length === 0 && sessionId) {
        try {
          const legendData = await fetchApi<{ tokens: { token: string; entityType: string; originalValue: string }[] }>(
            `/admin/sessions/${encodeURIComponent(sessionId)}/tokens`
          );
          if (legendData.tokens && legendData.tokens.length > 0) {
            setTokenLegend(legendData.tokens);
          }
        } catch {}
      }
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
          <h1 className="text-2xl font-bold text-on-surface">Upstream AI Providers</h1>
          <p className="text-sm text-on-surface-variant">
            Register multiple AI providers and routers. Test endpoints live in the interactive playground or copy proxy URLs.
          </p>
        </div>
        <button
          onClick={() => setShowAddDrawer(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-m3-md transition shrink-0 shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-m3-lg flex items-center gap-3 text-sm border ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
            : 'bg-red-950/40 border-red-800/50 text-red-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          {statusMessage.text}
        </div>
      )}

      {/* Providers Table Card */}
      <div className="bg-surface-container border border-outline-variant/60 rounded-m3-lg overflow-hidden shadow-lg">
        <div className="p-5 border-b border-outline-variant/60 bg-surface-container-low flex items-center justify-between">
          <div className="flex items-center gap-2 text-on-surface font-semibold text-xs uppercase tracking-wider">
            <Globe className="w-4 h-4 text-blue-400" /> Registered Providers & Proxy Endpoints
          </div>
          <span className="text-xs text-on-surface-variant font-mono">Total: {providers.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-on-surface">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/60">
              <tr>
                <th className="px-5 py-3.5">Provider Name & Target</th>
                <th className="px-5 py-3.5">Direct Proxy Endpoint</th>
                <th className="px-5 py-3.5 text-right">Client Setup & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-surface-container-low">
              {providers.map((p) => {
                const isCopied = copiedId === p.id;
                const proxyUrl = getProxyBaseUrl(p.id);

                return (
                  <tr key={p.id} className="hover:bg-surface-container-high transition">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-on-surface flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className="font-mono text-[10px] text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
                          id: {p.id}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-on-surface-variant truncate max-w-xs mt-1" title={p.baseUrl}>
                        Target: {p.baseUrl}
                      </div>
                      {p.description && <div className="text-[11px] text-on-surface-variant/80 mt-0.5">{p.description}</div>}
                    </td>

                    <td className="px-5 py-4 font-mono">
                      <button
                        type="button"
                        onClick={() => handleCopyBaseUrl(p.id)}
                        className={`group flex items-center gap-2 px-3 py-1.5 rounded-m3-md border text-[11px] font-mono transition text-left ${
                          isCopied
                            ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-950/40'
                            : 'bg-surface-container-low hover:bg-surface-container border-outline-variant/60 hover:border-outline-variant/50 text-emerald-400'
                        }`}
                        title="Click to copy Direct Proxy Endpoint URL"
                      >
                        <span className="truncate max-w-xs sm:max-w-md">{proxyUrl}</span>
                        <span className="shrink-0 text-on-surface-variant/80 group-hover:text-emerald-300 transition">
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
                          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 text-purple-300 border border-purple-500/30 rounded-m3-md transition text-xs font-semibold shadow-sm"
                          title="Open live playground to test requests with ephemeral secret key"
                        >
                          <FlaskConical className="w-3.5 h-3.5 text-purple-400" /> Playground
                        </button>

                        {/* 2. Edit Provider Button */}
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-m3-md border border-outline-variant/50 transition text-xs"
                          title="Edit provider settings and base URL"
                        >
                          <Pencil className="w-3.5 h-3.5 text-amber-400" /> Edit
                        </button>

                        {/* 3. Setup Guide Button */}
                        <button
                          onClick={() => setSelectedProviderForGuide(p)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-m3-md border border-outline-variant/50 transition text-xs"
                          title="View Claude Code, Cursor, and SDK setup instructions"
                        >
                          <Terminal className="w-3.5 h-3.5 text-on-surface-variant" /> Setup
                        </button>

                        {/* 4. Delete Provider */}
                        {providers.length > 1 && (
                          <button
                            onClick={() => handleDeleteProvider(p.id)}
                            className="p-1.5 text-on-surface-variant/80 hover:text-red-400 rounded-m3-md hover:bg-surface-container-high transition"
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
              className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs rounded-m3-md border border-outline-variant/50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editName.trim() || !editBaseUrl.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-m3-md transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        {selectedProviderForEdit && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Provider ID <span className="text-on-surface-variant/80 font-normal">(Permanent path identifier)</span>
              </label>
              <input
                type="text"
                value={selectedProviderForEdit.id}
                disabled
                className="w-full bg-surface-container border border-outline-variant/60 rounded-m3-lg px-3 py-2 text-xs text-on-surface-variant font-mono opacity-80 cursor-not-allowed"
              />
              <p className="text-[10px] text-on-surface-variant/80 mt-1 font-mono">
                Direct URL: {getProxyBaseUrl(selectedProviderForEdit.id)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">Display Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/60 rounded-m3-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">Target Upstream Base URL</label>
              <input
                type="url"
                value={editBaseUrl}
                onChange={(e) => setEditBaseUrl(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/60 rounded-m3-lg px-3 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-blue-500"
                required
              />
              <p className="text-[10px] text-on-surface-variant/80 mt-1">
                Example: https://api.openai.com or http://9router.mfahrurozi.my.id/api/v1
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">Description (Optional)</label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Provider description"
                className="w-full bg-surface-container-low border border-outline-variant/60 rounded-m3-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-blue-500"
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
            className="px-4 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-medium rounded-m3-md border border-outline-variant/50 transition"
          >
            Close Playground
          </button>
        }
      >
        {selectedProviderForPlayground && (
          <div className="space-y-5 text-xs text-on-surface leading-relaxed">
            {/* Ephemeral Key Warning Banner */}
            <div className="p-3.5 bg-blue-950/30 border border-blue-800/40 rounded-m3-lg flex items-start gap-3">
              <Key className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-blue-200 text-xs">Ephemeral In-Memory Secret Key</div>
                <p className="text-[11px] text-on-surface-variant">
                  Your secret key is stored <strong>only in browser memory for this session</strong>. It is never saved to database or localStorage, and is destroyed immediately when you close this window.
                </p>
              </div>
            </div>

            {/* Step 1: Input Ephemeral Key & Test Connection */}
            <div className="p-4 bg-surface-container-low border border-outline-variant/60 rounded-m3-lg space-y-3">
              <label className="block text-xs font-semibold text-on-surface">
                1. Provider API Secret Key <span className="text-on-surface-variant/80 font-normal">({selectedProviderForPlayground.name})</span>
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-... or provider authentication token"
                    value={ephemeralKey}
                    onChange={(e) => setEphemeralKey(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/60 rounded-m3-lg px-3.5 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/80 hover:text-on-surface"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !ephemeralKey.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-m3-lg transition disabled:opacity-50 shrink-0 shadow-md shadow-blue-600/20"
                >
                  {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>

              {/* Connection Status Indicator */}
              {connectionStatus && (
                <div className={`p-3 rounded-m3-md text-[11px] flex items-center gap-2 border ${
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

            {/* Step 2: Model Selection (Populated dynamically from router with Search) */}
            <div className="p-4 bg-surface-container-low border border-outline-variant/60 rounded-m3-lg space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-on-surface flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-primary" /> 2. Select AI Model
                </label>
                {availableModels.length > 0 ? (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/50">
                    {availableModels.length} models loaded
                  </span>
                ) : (
                  <span className="text-[10px] text-on-surface-variant">
                    Test connection above to load models
                  </span>
                )}
              </div>

              {availableModels.length > 0 ? (
                <div className="space-y-2 relative" ref={modelDropdownRef}>
                  {/* Dropdown Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="w-full flex items-center justify-between bg-surface-container border border-outline-variant/60 hover:border-primary/60 rounded-m3-lg px-3 py-2 text-xs text-on-surface font-mono transition-colors focus:outline-none focus:border-primary cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Cpu className="w-3.5 h-3.5 text-primary/80 shrink-0" />
                      <span className="truncate">
                        {selectedModel === 'custom'
                          ? `Custom: ${customModelInput || '(Enter below)'}`
                          : selectedModel || 'Select a model...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-on-surface-variant shrink-0 ml-2">
                      <span className="text-[10px] text-on-surface-variant/70">
                        {availableModels.indexOf(selectedModel) >= 0 ? `#${availableModels.indexOf(selectedModel) + 1}` : ''}
                      </span>
                      {isModelDropdownOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Searchable Dropdown Popover */}
                  {isModelDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-surface-container-high border border-outline-variant shadow-2xl rounded-m3-lg overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-100">
                      {/* Search Bar Input */}
                      <div className="p-2 border-b border-outline-variant/60 bg-surface-container flex items-center gap-2 sticky top-0 z-10">
                        <Search className="w-3.5 h-3.5 text-on-surface-variant shrink-0 ml-1" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search models (e.g. gpt-4, claude, llama, sonnet)..."
                          value={modelSearchQuery}
                          onChange={(e) => setModelSearchQuery(e.target.value)}
                          className="w-full bg-transparent text-xs text-on-surface font-mono placeholder:text-on-surface-variant/50 focus:outline-none"
                        />
                        {modelSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setModelSearchQuery('')}
                            className="p-1 hover:bg-surface-container-highest rounded text-on-surface-variant hover:text-on-surface"
                            title="Clear search"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Filter Count & Quick Info */}
                      <div className="px-3 py-1.5 bg-surface-container/40 border-b border-outline-variant/40 flex items-center justify-between text-[10px] text-on-surface-variant">
                        <span>
                          {modelSearchQuery ? (
                            <>
                              Matched{' '}
                              <strong className="text-on-surface">
                                {availableModels.filter((m) =>
                                  m.toLowerCase().includes(modelSearchQuery.toLowerCase().trim())
                                ).length}
                              </strong>{' '}
                              of {availableModels.length} models
                            </>
                          ) : (
                            `${availableModels.length} models available`
                          )}
                        </span>
                        {modelSearchQuery && (
                          <span className="text-[9px] uppercase tracking-wider text-primary font-semibold">
                            Filtered
                          </span>
                        )}
                      </div>

                      {/* Scrollable Model List */}
                      <div className="overflow-y-auto max-h-48 divide-y divide-outline-variant/20">
                        {availableModels
                          .filter((m) =>
                            m.toLowerCase().includes(modelSearchQuery.toLowerCase().trim())
                          )
                          .map((m) => {
                            const isSelected = selectedModel === m;
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  setSelectedModel(m);
                                  setIsModelDropdownOpen(false);
                                  setModelSearchQuery('');
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center justify-between hover:bg-surface-container-highest/80 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-on-surface'
                                }`}
                              >
                                <span className="truncate pr-2">{m}</span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                )}
                              </button>
                            );
                          })}

                        {/* If search yields 0 results */}
                        {availableModels.filter((m) =>
                          m.toLowerCase().includes(modelSearchQuery.toLowerCase().trim())
                        ).length === 0 && (
                          <div className="p-3 text-center space-y-2">
                            <p className="text-xs text-on-surface-variant">
                              No models matching "{modelSearchQuery}"
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedModel('custom');
                                setCustomModelInput(modelSearchQuery.trim());
                                setIsModelDropdownOpen(false);
                                setModelSearchQuery('');
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-m3-md font-mono cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              Use "{modelSearchQuery.trim()}" as custom model
                            </button>
                          </div>
                        )}

                        {/* Custom Model Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedModel('custom');
                            setIsModelDropdownOpen(false);
                            setModelSearchQuery('');
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center justify-between border-t border-outline-variant/60 hover:bg-surface-container-highest/80 transition-colors cursor-pointer ${
                            selectedModel === 'custom'
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Pencil className="w-3 h-3 text-primary/70" />
                            -- Enter Custom Model ID --
                          </span>
                          {selectedModel === 'custom' && (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Custom Model Input (if selected) */}
                  {selectedModel === 'custom' && (
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Enter custom model ID (e.g. meta-llama/llama-3-70b)"
                        value={customModelInput}
                        onChange={(e) => setCustomModelInput(e.target.value)}
                        className="w-full bg-surface-container border border-outline-variant/60 rounded-m3-lg px-3 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter model ID (e.g. gpt-4o, claude-3-5-sonnet, deepseek-chat)"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/60 rounded-m3-lg px-3 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-on-surface-variant/80 mr-1">Presets:</span>
                    {['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', 'deepseek-chat', 'gemini-1.5-pro'].map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCustomModelInput(preset)}
                          className="text-[10px] font-mono px-2 py-0.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/50 rounded-m3-xs transition-colors cursor-pointer"
                        >
                          {preset}
                        </button>
                      )
                    )}
                  </div>
                  <p className="text-[10px] text-on-surface-variant/80">
                    Tip: Click <strong>Test Connection</strong> above to automatically fetch available models from this router.
                  </p>
                </div>
              )}
            </div>

            {/* Step 3: Interactive Prompt Input */}
            <div className="p-4 bg-surface-container-low border border-outline-variant/60 rounded-m3-lg space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-on-surface flex items-center gap-1.5">
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
                className="w-full bg-surface-container border border-outline-variant/60 rounded-m3-lg p-3 text-xs text-on-surface font-mono focus:outline-none focus:border-blue-500 resize-y"
                placeholder="Enter prompt containing sensitive data..."
              />

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStreamMode(!streamMode)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-m3-md text-xs font-mono transition-colors cursor-pointer border ${
                    streamMode
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                      : 'bg-surface-container border-outline-variant/60 text-on-surface-variant hover:text-on-surface'
                  }`}
                  title="Stream responses in real-time token-by-token using SSE"
                >
                  <Zap className={`w-3.5 h-3.5 ${streamMode ? 'text-emerald-400 fill-emerald-400' : 'text-on-surface-variant'}`} />
                  <span>Streaming (SSE): {streamMode ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendPlaygroundRequest}
                  disabled={isSendingRequest || !ephemeralKey.trim() || !playgroundPrompt.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-m3-lg transition disabled:opacity-50 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  {isSendingRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>
                    {isSendingRequest
                      ? `Streaming from AI (${requestElapsedSeconds}s)...`
                      : 'Send Request via Privacy Proxy'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {playgroundError && (
              <div className="p-3.5 bg-red-950/40 border border-red-800/50 rounded-m3-lg text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="break-all">{playgroundError}</div>
              </div>
            )}

            {/* Step 4: 3-Stage Privacy Verification Inspector */}
            {playgroundResponse && (
              <div className="p-4 bg-surface-container-low border border-outline-variant/60 rounded-m3-lg space-y-4 shadow-xl">
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-outline-variant/60">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface text-xs flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" /> 4. Privacy Inspection & Verification
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900/50">
                      HTTP {playgroundResponse.status} OK
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono">
                    <span>⚡ {playgroundResponse.latencyMs}ms total</span>
                    {playgroundResponse.tokensUsed && <span>📊 {playgroundResponse.tokensUsed} tokens</span>}
                  </div>
                </div>

                {/* Process Time Breakdown & 3-Step Lifecycle Cards */}
                <div className="bg-surface-container border border-outline-variant/60 rounded-m3-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-blue-400" />
                      <span>Step-by-Step Processing Duration</span>
                    </div>
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      Total Latency: <strong className="text-on-surface">{playgroundResponse.latencyMs}ms</strong>
                    </span>
                  </div>

                  {/* 3-Step Timing Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Step 1 Duration */}
                    <div className="p-2.5 bg-blue-950/20 border border-blue-900/40 rounded-m3-md flex flex-col justify-between space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-blue-300 font-semibold flex items-center gap-1">
                          <Lock className="w-3 h-3 text-blue-400" /> 1. Ingress Sanitization
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">
                          {playgroundResponse.presidioMs ?? 0}ms
                        </span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant leading-tight">
                        Presidio NLP entity recognition & local Redis token vault mapping
                      </p>
                    </div>

                    {/* Step 2 Duration */}
                    <div className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded-m3-md flex flex-col justify-between space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-amber-300 font-semibold flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-amber-400" /> 2. Cloud AI Inference
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                          {playgroundResponse.llmMs ?? playgroundResponse.latencyMs}ms
                        </span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant leading-tight">
                        Upstream network round-trip & cloud LLM generation
                      </p>
                    </div>

                    {/* Step 3 Duration */}
                    <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-m3-md flex flex-col justify-between space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-300 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-400" /> 3. Detokenization
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          {playgroundResponse.proxyOverheadMs && playgroundResponse.proxyOverheadMs > 0 ? `${playgroundResponse.proxyOverheadMs}ms` : '< 1ms'}
                        </span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant leading-tight">
                        Real-time token replacement & plaintext delivery to client
                      </p>
                    </div>
                  </div>

                  {/* Relative Timeline Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 transition-all duration-500"
                        title={`PII Sanitization: ${playgroundResponse.presidioMs || 0}ms`}
                        style={{ width: `${Math.max(3, Math.min(100, ((playgroundResponse.presidioMs || 0) / (playgroundResponse.latencyMs || 1)) * 100))}%` }}
                      />
                      <div
                        className="bg-amber-500 transition-all duration-500"
                        title={`Cloud AI: ${playgroundResponse.llmMs || playgroundResponse.latencyMs}ms`}
                        style={{ width: `${Math.max(5, Math.min(100, (((playgroundResponse.llmMs || playgroundResponse.latencyMs) || 0) / (playgroundResponse.latencyMs || 1)) * 100))}%` }}
                      />
                      <div
                        className="bg-emerald-500 transition-all duration-500"
                        title={`Detokenizer: ${playgroundResponse.proxyOverheadMs || 1}ms`}
                        style={{ width: `${Math.max(3, Math.min(100, ((playgroundResponse.proxyOverheadMs || 1) / (playgroundResponse.latencyMs || 1)) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-on-surface-variant font-mono">
                      <span className="text-blue-400">● 1. Ingress ({playgroundResponse.presidioMs ?? 0}ms)</span>
                      <span className="text-amber-400">● 2. Cloud AI ({playgroundResponse.llmMs ?? playgroundResponse.latencyMs}ms)</span>
                      <span className="text-emerald-400">● 3. Detokenizer ({playgroundResponse.proxyOverheadMs ? `${playgroundResponse.proxyOverheadMs}ms` : '<1ms'})</span>
                    </div>
                  </div>
                </div>

                {/* 3-View Tab Switcher with per-step timing badges */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-surface-container rounded-m3-lg border border-outline-variant/60 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setActivePlaygroundTab('sent_external')}
                    className={`py-2 px-1.5 rounded-m3-md flex flex-wrap items-center justify-center gap-1.5 transition text-center cursor-pointer ${
                      activePlaygroundTab === 'sent_external'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Lock className="w-3 h-3 shrink-0" />
                      <span>1. Sent to External</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/20 border border-white/10 font-normal">
                      {playgroundResponse.presidioMs ?? 0}ms
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePlaygroundTab('raw_external')}
                    className={`py-2 px-1.5 rounded-m3-md flex flex-wrap items-center justify-center gap-1.5 transition text-center cursor-pointer ${
                      activePlaygroundTab === 'raw_external'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 shrink-0" />
                      <span>2. Upstream Raw</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/20 border border-white/10 font-normal">
                      {playgroundResponse.llmMs ?? playgroundResponse.latencyMs}ms
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePlaygroundTab('client')}
                    className={`py-2 px-1.5 rounded-m3-md flex flex-wrap items-center justify-center gap-1.5 transition text-center cursor-pointer ${
                      activePlaygroundTab === 'client'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>3. Client Delivery</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/20 border border-white/10 font-normal">
                      {playgroundResponse.latencyMs}ms total
                    </span>
                  </button>
                </div>

                {/* Tab 1: Sent to External Router (Sanitized with Tokens) */}
                {activePlaygroundTab === 'sent_external' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-blue-300 font-semibold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-400" /> Sanitized Prompt (Received by Cloud AI / Router)
                      </span>
                      <span className="text-[10px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/50 font-mono">
                        Ingress Time: {playgroundResponse.presidioMs ?? 0}ms • Zero PII Leak
                      </span>
                    </div>
                    <div className="p-3.5 bg-blue-950/20 border border-blue-900/50 rounded-m3-lg font-mono text-xs text-blue-100 whitespace-pre-wrap leading-relaxed">
                      {playgroundResponse.sanitizedPrompt || playgroundPrompt}
                    </div>
                    <p className="text-[10px] text-on-surface-variant">
                      All sensitive personal data (names, emails, crypto addresses) was replaced with surrogate tokens in {playgroundResponse.presidioMs ?? 0}ms before leaving your local server.
                    </p>
                  </div>
                )}

                {/* Tab 2: Raw Response from External Router */}
                {activePlaygroundTab === 'raw_external' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-amber-400" /> Raw Response (Tokenized Response Sent by AI)
                      </span>
                      <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/50 font-mono">
                        Cloud Generation Time: {playgroundResponse.llmMs ?? playgroundResponse.latencyMs}ms
                      </span>
                    </div>
                    <div className="p-3.5 bg-amber-950/20 border border-amber-900/50 rounded-m3-lg font-mono text-xs text-amber-100 whitespace-pre-wrap leading-relaxed">
                      <HighlightedTokenText text={playgroundResponse.rawUpstreamResponse || playgroundResponse.text} legend={tokenLegend} />
                    </div>
                    <p className="text-[10px] text-on-surface-variant">
                      The cloud AI model took {playgroundResponse.llmMs ?? playgroundResponse.latencyMs}ms to generate responses referencing surrogate tokens without ever seeing your actual sensitive data.
                    </p>
                  </div>
                )}

                {/* Tab 3: Final Client Plaintext Result */}
                {activePlaygroundTab === 'client' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Detokenized Result (Final Output Delivered to Client / IDE)
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/50 font-mono">
                        Detokenizer: {playgroundResponse.proxyOverheadMs ? `${playgroundResponse.proxyOverheadMs}ms` : '<1ms'} • Total: {playgroundResponse.latencyMs}ms
                      </span>
                    </div>
                    <div className="p-3.5 bg-surface-container border border-emerald-800/40 rounded-m3-lg font-mono text-xs text-on-surface whitespace-pre-wrap leading-relaxed min-h-[80px]">
                      {playgroundResponse.text ? (
                        <>
                          {playgroundResponse.text}
                          {isSendingRequest && (
                            <span className="inline-block w-2 h-3.5 bg-emerald-400 animate-pulse ml-0.5 align-middle" />
                          )}
                        </>
                      ) : isSendingRequest ? (
                        <div className="flex items-center gap-2 text-on-surface-variant italic">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>Connecting to upstream stream & waiting for first token...</span>
                        </div>
                      ) : (
                        <span className="text-on-surface-variant italic">Empty response</span>
                      )}
                    </div>
                    <p className="text-[10px] text-on-surface-variant">
                      The Privacy Proxy transparently restores surrogate tokens back to their original values before delivering the response to your client application or IDE.
                    </p>
                  </div>
                )}

                {/* Token Mapping Legend Table */}
                {tokenLegend.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-outline-variant/60 space-y-2">
                    <div className="text-[11px] font-semibold text-on-surface flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>Token Transformation Legend</span>
                      <span className="text-on-surface-variant/80 font-normal ml-1">— {tokenLegend.length} entities intercepted</span>
                    </div>
                    <div className="overflow-x-auto rounded-m3-lg border border-outline-variant/60">
                      <table className="w-full text-[11px] font-mono">
                        <thead>
                          <tr className="bg-surface-container border-b border-outline-variant/60 text-[10px] uppercase tracking-wider text-on-surface-variant">
                            <th className="px-3 py-2 text-left">Entity Type</th>
                            <th className="px-3 py-2 text-left">Surrogate Token Sent to AI</th>
                            <th className="px-3 py-2 text-left">Original Sensitive Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {tokenLegend.map((entry, idx) => (
                            <tr key={idx} className="bg-surface-container-low hover:bg-surface-container transition">
                              <td className="px-3 py-2">
                                <EntityTypeBadge type={entry.entityType} />
                              </td>
                              <td className="px-3 py-2 text-blue-300">{entry.token}</td>
                              <td className="px-3 py-2 text-emerald-300">{entry.originalValue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
            className="px-4 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-medium rounded-m3-md border border-outline-variant/50 transition"
          >
            Close
          </button>
        }
      >
        {selectedProviderForGuide && (
          <div className="space-y-5 text-xs text-on-surface leading-relaxed">
            {/* Claude Code Integration */}
            <div className="p-4 bg-surface-container-low border border-outline-variant/60 rounded-m3-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-on-surface flex items-center gap-1.5">
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
              <p className="text-on-surface-variant text-[11px]">
                Run this command in your terminal before launching Claude Code:
              </p>
              <div className="p-2.5 bg-surface-container border border-outline-variant/60 rounded-m3-md font-mono text-[11px] text-purple-300 break-all">
                export ANTHROPIC_BASE_URL="{getClaudeBaseUrl(selectedProviderForGuide.id)}"
              </div>
            </div>

            {/* OpenAI / 9router / Cursor SDK Integration */}
            <div className="p-4 bg-surface-container-low border border-outline-variant/60 rounded-m3-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-on-surface flex items-center gap-1.5">
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
              <div className="p-2.5 bg-surface-container border border-outline-variant/60 rounded-m3-md font-mono text-[11px] text-emerald-300 break-all">
                export OPENAI_BASE_URL="{getProxyBaseUrl(selectedProviderForGuide.id)}"
              </div>
            </div>

            {/* Curl Sample */}
            <div className="p-4 bg-surface-container-low border border-outline-variant/60 rounded-m3-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-on-surface flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-blue-400" /> 3. REST API / cURL Request
                </span>
              </div>
              <div className="p-2.5 bg-surface-container border border-outline-variant/60 rounded-m3-md font-mono text-[10px] text-blue-300 leading-relaxed overflow-x-auto">
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
              className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs rounded-m3-md border border-outline-variant/50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddProvider}
              disabled={!newId.trim() || !newName.trim() || !newBaseUrl.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-m3-md transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              Register Provider
            </button>
          </>
        }
      >
        <form onSubmit={handleAddProvider} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Provider Unique ID <span className="text-on-surface-variant/80 font-mono">(Used in URL path)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 9router, deepseek, groq"
              value={newId}
              onChange={(e) => setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
              className="w-full bg-surface-container-low border border-outline-variant/60 rounded-m3-lg px-3 py-2 text-xs text-blue-300 font-mono focus:outline-none focus:border-blue-500"
              required
            />
            <p className="text-[10px] text-on-surface-variant/80 mt-1 font-mono">
              Direct URL will be: {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/p/{newId || ':id'}/v1
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Display Name</label>
            <input
              type="text"
              placeholder="e.g. 9router Unified Gateway"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/60 rounded-m3-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Target Upstream Base URL</label>
            <input
              type="url"
              placeholder="e.g. http://9router.mfahrurozi.my.id/api/v1"
              value={newBaseUrl}
              onChange={(e) => setNewBaseUrl(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/60 rounded-m3-lg px-3 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Self-hosted 9router AI endpoint"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/60 rounded-m3-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-blue-500"
            />
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}
