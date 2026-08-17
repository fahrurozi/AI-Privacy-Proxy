import React, { useEffect, useState, useMemo } from 'react';
import { CustomRecognizerConfig } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { SlideOverDrawer } from '../components/SlideOverDrawer.js';
import { Sparkles, Plus, Trash2, CheckCircle2, AlertCircle, Play, Code2, ShieldAlert } from 'lucide-react';

export function RecognizersPage() {
  const [customList, setCustomList] = useState<CustomRecognizerConfig[]>([]);
  const [registeredList, setRegisteredList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Right Drawer State
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState('');
  const [pattern, setPattern] = useState('');
  const [score, setScore] = useState(0.85);
  const [testInput, setTestInput] = useState('My contract token is 0x71C8F794B32145429631994304244a1234567890');

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

  // Live Regex Match Tester in browser
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

      setStatusMessage({ text: `Custom recognizer "${name}" added and activated!`, type: 'success' });
      setShowAddDrawer(false);
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
    if (!window.confirm('Delete this custom recognizer?')) return;
    try {
      await fetchApi(`/admin/recognizers/${id}`, { method: 'DELETE' });
      setCustomList((prev) => prev.filter((r) => r.id !== id));
      setStatusMessage({ text: 'Recognizer removed successfully.', type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to delete: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Custom Entity Recognizers</h1>
          <p className="text-sm text-slate-400">
            Define regular expressions or pattern rules to detect custom secrets, IDs, tokens, and domain PII.
          </p>
        </div>
        <button
          onClick={() => setShowAddDrawer(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" /> Add Custom Recognizer
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

      {/* Registered Custom Recognizers List */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-blue-400" /> Active Custom Recognizers
        </h2>
        {customList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customList.map((rec) => (
              <div key={rec.id || rec.name} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">{rec.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {rec.entityType}
                    </span>
                  </div>
                  <div className="mt-2 font-mono text-xs text-blue-300 break-all bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    {rec.pattern}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Confidence: {(rec.score * 100).toFixed(0)}%
                  </div>
                </div>
                <button
                  onClick={() => rec.id && handleDelete(rec.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-900 transition ml-2"
                  title="Delete recognizer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
            <Sparkles className="w-8 h-8 mb-2 opacity-30" />
            <span>No custom regex recognizers added yet.</span>
            <span className="mt-1 text-slate-600">Click "Add Custom Recognizer" to create one.</span>
          </div>
        )}
      </div>

      {/* RIGHT SLIDE-OVER DRAWER: Add Custom Pattern Recognizer */}
      <SlideOverDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        title="Add Custom Pattern Recognizer"
        subtitle="Configure regular expressions with real-time matching verification"
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
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition shadow-lg shadow-blue-600/20"
            >
              Save & Activate Recognizer
            </button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Recognizer Name</label>
            <input
              type="text"
              placeholder="e.g. AWS_SECRET_TOKEN or ORG_BADGE_ID"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Entity Type</label>
            <input
              type="text"
              placeholder="e.g. API_KEY or CUSTOM_SECRET"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full bg-slate-950 font-mono border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-blue-400 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Regular Expression (Regex)</label>
            <input
              type="text"
              placeholder="e.g. \\bAKIA[0-9A-Z]{16}\\b"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full bg-slate-950 font-mono border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-blue-400 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
              <span>Confidence Threshold</span>
              <span className="font-mono text-blue-400 font-semibold">{(score * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={score}
              onChange={(e) => setScore(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Interactive Regex Test Box inside Drawer */}
          <div className="p-4 bg-slate-950 border border-slate-800/90 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 font-medium text-slate-300">
                <Play className="w-3.5 h-3.5 text-emerald-400" /> Live Match Tester
              </span>
              <span>Matches: <strong className="text-emerald-400 font-mono">{matches.length}</strong></span>
            </div>
            <textarea
              rows={3}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Type sample text here to test your regex matches in real time..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none font-mono"
            />
            {matches.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {matches.map((m, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}
