import React, { useEffect, useState } from 'react';
import { EntityPolicy, PrivacyAction } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { Shield, Plus, Save, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const ACTIONS: PrivacyAction[] = ['TOKENIZE', 'REDACT', 'BLOCK', 'PASS'];

export function PolicyPage() {
  const [policies, setPolicies] = useState<EntityPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New policy modal / input state
  const [newEntity, setNewEntity] = useState('');
  const [newAction, setNewAction] = useState<PrivacyAction>('TOKENIZE');
  const [newScore, setNewScore] = useState(0.75);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await fetchApi<{ policies: EntityPolicy[] }>('/admin/policy');
      setPolicies(data.policies);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to load policies: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleActionChange = (entityType: string, action: PrivacyAction) => {
    setPolicies((prev) =>
      prev.map((p) => (p.entityType === entityType ? { ...p, action } : p))
    );
  };

  const handleScoreChange = (entityType: string, minScore: number) => {
    setPolicies((prev) =>
      prev.map((p) => (p.entityType === entityType ? { ...p, minScore } : p))
    );
  };

  const handleDeletePolicy = (entityType: string) => {
    setPolicies((prev) => prev.filter((p) => p.entityType !== entityType));
  };

  const handleAddPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntity.trim()) return;
    const upper = newEntity.trim().toUpperCase().replace(/\s+/g, '_');
    if (policies.some((p) => p.entityType === upper)) {
      setStatusMessage({ text: `Entity ${upper} already exists`, type: 'error' });
      return;
    }
    setPolicies((prev) => [...prev, { entityType: upper, action: newAction, minScore: newScore }]);
    setNewEntity('');
    setShowAddForm(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await fetchApi('/admin/policy', {
        method: 'PUT',
        body: JSON.stringify({ policies }),
      });
      setStatusMessage({ text: 'Privacy policies saved and applied successfully!', type: 'success' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to save policies: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getActionBadgeColor = (action: PrivacyAction) => {
    switch (action) {
      case 'TOKENIZE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'REDACT':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'BLOCK':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'PASS':
        return 'bg-slate-700/50 text-slate-400 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Privacy Policy Settings</h1>
          <p className="text-sm text-slate-400">Configure how detected entities and secrets are processed at the gateway.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            <Plus className="w-4 h-4" /> Add Entity Rule
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Apply Changes'}
          </button>
        </div>
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

      {/* Add Entity Modal / Form */}
      {showAddForm && (
        <div className="bg-slate-900 border border-slate-700 p-5 rounded-xl space-y-4">
          <h2 className="text-base font-semibold text-slate-100">Add New Entity Action Rule</h2>
          <form onSubmit={handleAddPolicy} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Entity Type</label>
              <input
                type="text"
                placeholder="e.g. PASSPORT_NUMBER"
                value={newEntity}
                onChange={(e) => setNewEntity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Action</label>
              <select
                value={newAction}
                onChange={(e) => setNewAction(e.target.value as PrivacyAction)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {ACTIONS.map((act) => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Confidence Threshold: <span className="font-mono text-blue-400">{(newScore * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={newScore}
                onChange={(e) => setNewScore(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition w-full"
              >
                Add Rule
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg border border-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Policy Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Entity Type</th>
                <th className="px-6 py-4">Action Mode</th>
                <th className="px-6 py-4">Confidence Threshold</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {policies.map((p) => (
                <tr key={p.entityType} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4 font-mono font-medium text-slate-100 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    {p.entityType}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={p.action}
                      onChange={(e) => handleActionChange(p.entityType, e.target.value as PrivacyAction)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {ACTIONS.map((act) => (
                        <option key={act} value={act}>{act}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 max-w-xs">
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={p.minScore ?? 0.7}
                        onChange={(e) => handleScoreChange(p.entityType, parseFloat(e.target.value))}
                        className="w-28 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-400">
                        {((p.minScore ?? 0.7) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionBadgeColor(p.action)}`}>
                      {p.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeletePolicy(p.entityType)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
