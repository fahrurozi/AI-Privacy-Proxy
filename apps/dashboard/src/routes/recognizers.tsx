import React, { useEffect, useState, useMemo } from 'react';
import { CustomRecognizerConfig } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { SlideOverDrawer } from '../components/SlideOverDrawer.js';
import { Sparkles, Plus, Trash2, CheckCircle2, AlertCircle, Play, Code2 } from 'lucide-react';

export function RecognizersPage() {
  const [customList, setCustomList] = useState<CustomRecognizerConfig[]>([]);
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
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
            Custom Entity Recognizers
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Define regular expressions or pattern rules to detect custom secrets, IDs, tokens, and domain PII.
          </p>
        </div>
        <button
          onClick={() => setShowAddDrawer(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-on text-xs font-semibold rounded-m3-full shadow-m3-1 hover:shadow-m3-2 transition-all m3-state-layer"
        >
          <Plus className="w-4 h-4" /> Add Custom Recognizer
        </button>
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

      {/* Registered Custom Recognizers List */}
      <div className="bg-surface-container-low border border-outline-variant/60 p-6 sm:p-8 rounded-m3-xl space-y-4 shadow-m3-1">
        <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" /> Active Custom Recognizers
        </h2>
        {customList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customList.map((rec) => (
              <div key={rec.id || rec.name} className="p-5 bg-surface-container border border-outline-variant/50 rounded-m3-lg flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-on-surface">{rec.name}</span>
                    <span className="px-2.5 py-0.5 rounded-m3-full text-[10px] font-mono font-bold bg-primary-container text-primary-on-container">
                      {rec.entityType}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-primary break-all bg-surface-container-highest p-3 rounded-m3-md border border-outline-variant/40">
                    {rec.pattern}
                  </div>
                  <div className="text-xs text-on-surface-variant font-medium">
                    Confidence Threshold: <strong className="text-on-surface">{(rec.score * 100).toFixed(0)}%</strong>
                  </div>
                </div>
                <button
                  onClick={() => rec.id && handleDelete(rec.id)}
                  className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-m3-full transition ml-2"
                  title="Delete recognizer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-on-surface-variant text-xs flex flex-col items-center justify-center">
            <Sparkles className="w-8 h-8 mb-2 opacity-30 text-primary" />
            <span className="font-medium">No custom regex recognizers added yet.</span>
            <span className="mt-1 text-on-surface-variant/80">Click "Add Custom Recognizer" to create one.</span>
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
              className="px-4 py-2 bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-semibold rounded-m3-full transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              className="px-5 py-2 bg-primary text-primary-on text-xs font-semibold rounded-m3-full shadow-m3-1 hover:shadow-m3-2 transition-all m3-state-layer"
            >
              Save & Activate Recognizer
            </button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">Recognizer Name</label>
            <input
              type="text"
              placeholder="e.g. AWS_SECRET_TOKEN or ORG_BADGE_ID"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/60 rounded-m3-md px-3.5 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">Target Entity Type</label>
            <input
              type="text"
              placeholder="e.g. API_KEY or CUSTOM_SECRET"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full bg-surface-container font-mono border border-outline-variant/60 rounded-m3-md px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">Regular Expression (Regex)</label>
            <input
              type="text"
              placeholder="e.g. \\bAKIA[0-9A-Z]{16}\\b"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full bg-surface-container font-mono border border-outline-variant/60 rounded-m3-md px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-bold text-on-surface mb-1.5">
              <span>Confidence Threshold</span>
              <span className="font-mono text-primary font-bold">{(score * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={score}
              onChange={(e) => setScore(parseFloat(e.target.value))}
              className="w-full h-2 bg-surface-container-highest rounded-m3-full appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Interactive Regex Test Box inside Drawer */}
          <div className="p-4 bg-surface-container border border-outline-variant/50 rounded-m3-lg space-y-2">
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span className="flex items-center gap-1 font-bold text-on-surface">
                <Play className="w-3.5 h-3.5 text-secondary" /> Live Match Tester
              </span>
              <span>Matches: <strong className="text-secondary font-mono">{matches.length}</strong></span>
            </div>
            <textarea
              rows={3}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Type sample text here to test your regex matches in real time..."
              className="w-full bg-surface-container-high border border-outline-variant/60 rounded-m3-md p-3 text-xs text-on-surface focus:outline-none font-mono"
            />
            {matches.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {matches.map((m, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-m3-full bg-secondary-container text-secondary-on-container text-xs font-mono font-bold">
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
