import React, { useEffect, useState, useMemo } from 'react';
import { CustomRecognizerConfig } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { Sparkles, Plus, Trash2, CheckCircle2, AlertCircle, Play } from 'lucide-react';

export function RecognizersPage() {
  const [customList, setCustomList] = useState<CustomRecognizerConfig[]>([]);
  const [registeredList, setRegisteredList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Recognizer Form
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState('');
  const [pattern, setPattern] = useState('');
  const [score, setScore] = useState(0.85);
  const [testInput, setTestInput] = useState('My contract token is 0x71C8F794B32145429631994304244');

  const loadRecognizers = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<{ custom: CustomRecognizerConfig[]; registered: any[] }>('/admin/recognizers');
      setCustomList(data.custom || []);
      setRegisteredList(data.registered || []);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to load recognizers: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecognizers();
  }, []);

  // Live Regex Match Tester
  const matches = useMemo(() => {
    if (!pattern || !testInput) return [];
    try {
      const re = new RegExp(pattern, 'g');
      return Array.from(testInput.matchAll(re)).map((m) => m[0]);
    } catch {
      return [];
    }
  }, [pattern, testInput]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !entityType || !pattern) return;

    try {
      // Validate regex client-side
      new RegExp(pattern);
    } catch (e: any) {
      setStatusMessage({ text: `Invalid Regular Expression: ${e.message}`, type: 'error' });
      return;
    }

    try {
      await fetchApi('/admin/recognizers', {
        method: 'POST',
        body: JSON.stringify({
          name,
          entityType: entityType.toUpperCase(),
          pattern,
          score,
          enabled: true,
        }),
      });

      setStatusMessage({ text: `Recognizer "${name}" added successfully!`, type: 'success' });
      setName('');
      setEntityType('');
      setPattern('');
      loadRecognizers();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to add recognizer: ${err.message}`, type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchApi(`/admin/recognizers/${id}`, { method: 'DELETE' });
      setCustomList((prev) => prev.filter((r) => r.id !== id));
      setStatusMessage({ text: 'Recognizer removed', type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to delete: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Custom Entity Recognizers</h1>
        <p className="text-sm text-slate-400">Add regular expressions or pattern rules to detect custom secrets, IDs, and domain-specific PII.</p>
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

      {/* Add Recognizer with Live Interactive Sandbox */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-5">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" /> Add Custom Pattern Recognizer
        </h2>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Recognizer Name</label>
              <input
                type="text"
                placeholder="e.g. AWS_SECRET_TOKEN"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Entity Type</label>
              <input
                type="text"
                placeholder="e.g. API_KEY or CUSTOM_ID"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Confidence: <span className="font-mono text-blue-400">{(score * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={score}
                onChange={(e) => setScore(parseFloat(e.target.value))}
                className="w-full h-2 mt-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Regular Expression (Regex)</label>
            <input
              type="text"
              placeholder="e.g. \\bAKIA[0-9A-Z]{16}\\b"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full bg-slate-950 font-mono border border-slate-800 rounded-lg px-3 py-2 text-sm text-blue-400 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Interactive Regex Test Box */}
          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 font-medium text-slate-300">
                <Play className="w-3.5 h-3.5 text-emerald-400" /> Live Interactive Sandbox
              </span>
              <span>Matches: <strong className="text-emerald-400 font-mono">{matches.length}</strong></span>
            </div>
            <textarea
              rows={2}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Type sample text here to test your regex matches in real time..."
              className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none"
            />
            {matches.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {matches.map((m, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Save Recognizer
          </button>
        </form>
      </div>

      {/* Existing Custom Recognizers List */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <h2 className="text-base font-semibold text-slate-100">Registered Custom Recognizers</h2>
        {customList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customList.map((rec) => (
              <div key={rec.id || rec.name} className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">{rec.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {rec.entityType}
                    </span>
                  </div>
                  <div className="mt-2 font-mono text-xs text-slate-400 break-all bg-slate-900 p-2 rounded border border-slate-800">
                    {rec.pattern}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Confidence: {(rec.score * 100).toFixed(0)}%
                  </div>
                </div>
                <button
                  onClick={() => rec.id && handleDelete(rec.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-900 transition ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-sm">
            No custom regex recognizers added yet.
          </div>
        )}
      </div>
    </div>
  );
}
