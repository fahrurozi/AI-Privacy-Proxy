import React, { useEffect, useState } from 'react';
import { EntityPolicy, PrivacyAction } from '@ai-privacy-proxy/shared';
import { fetchApi } from '../lib/api.js';
import { SlideOverDrawer } from '../components/SlideOverDrawer.js';
import {
  Shield,
  Plus,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Info,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  HelpCircle,
} from 'lucide-react';

const ACTIONS: PrivacyAction[] = ['TOKENIZE', 'REDACT', 'BLOCK', 'PASS'];

export function PolicyPage() {
  const [policies, setPolicies] = useState<EntityPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Detail Drawer State
  const [selectedPolicyForDetail, setSelectedPolicyForDetail] = useState<EntityPolicy | null>(null);

  // Add Entity Drawer State
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [newEntity, setNewEntity] = useState('');
  const [newAction, setNewAction] = useState<PrivacyAction>('TOKENIZE');
  const [newScore, setNewScore] = useState(0.75);
  const [newDesc, setNewDesc] = useState('');

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

  const handleToggleEnabled = (entityType: string) => {
    setPolicies((prev) =>
      prev.map((p) =>
        p.entityType === entityType ? { ...p, enabled: p.enabled === false ? true : false } : p
      )
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
      setStatusMessage({ text: `Entity rule for ${upper} already exists.`, type: 'error' });
      return;
    }
    setPolicies((prev) => [
      ...prev,
      {
        entityType: upper,
        action: newAction,
        minScore: newScore,
        enabled: true,
        description: newDesc.trim() || 'Custom user-defined entity rule.',
      },
    ]);
    setNewEntity('');
    setNewDesc('');
    setShowAddDrawer(false);
    setStatusMessage({ text: `Entity rule "${upper}" staged. Click "Apply Changes" to save.`, type: 'success' });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await fetchApi('/admin/policy', {
        method: 'PUT',
        body: JSON.stringify({ policies }),
      });
      setStatusMessage({ text: 'Privacy policies updated and applied successfully in real-time!', type: 'success' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ text: `Failed to save policies: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getActionBadgeColor = (action: PrivacyAction, enabled?: boolean) => {
    if (enabled === false) {
      return 'bg-slate-800 text-slate-500 border-slate-700';
    }
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
          <p className="text-sm text-slate-400">
            Define real-time protection actions (TOKENIZE, REDACT, BLOCK, PASS) per detected entity type.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddDrawer(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            <Plus className="w-4 h-4" /> Add Entity Rule
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
          >
            <Save className="w-4 h-4" /> {saving ? 'Applying...' : 'Apply Changes'}
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

      {/* Policy Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Entity Type</th>
                <th className="px-6 py-4">Active Action</th>
                <th className="px-6 py-4">Confidence Threshold</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
              {policies.map((p) => {
                const isEnabled = p.enabled !== false;
                return (
                  <tr key={p.entityType} className={`hover:bg-slate-800/30 transition ${!isEnabled ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 font-mono font-medium text-slate-100">
                      <div className="flex items-center gap-2">
                        <Shield className={`w-4 h-4 ${isEnabled ? 'text-blue-400' : 'text-slate-600'}`} />
                        <div>
                          <span className="text-slate-100">{p.entityType}</span>
                          {p.description && (
                            <div className="text-[11px] text-slate-500 font-sans truncate max-w-xs mt-0.5">
                              {p.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <select
                        disabled={!isEnabled}
                        value={p.action}
                        onChange={(e) => handleActionChange(p.entityType, e.target.value as PrivacyAction)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer"
                      >
                        {ACTIONS.map((act) => (
                          <option key={act} value={act}>{act}</option>
                        ))}
                      </select>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5 max-w-xs">
                        <input
                          type="range"
                          disabled={!isEnabled}
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={p.minScore ?? 0.7}
                          onChange={(e) => handleScoreChange(p.entityType, parseFloat(e.target.value))}
                          className="w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
                        />
                        <span className="text-xs font-mono text-slate-400">
                          {((p.minScore ?? 0.7) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium border ${getActionBadgeColor(p.action, isEnabled)}`}>
                        {isEnabled ? p.action : 'DISABLED (PASS)'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Detail Button */}
                        <button
                          onClick={() => setSelectedPolicyForDetail(p)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                          title="View entity details and behavior explanation"
                        >
                          <Info className="w-3.5 h-3.5 text-blue-400" /> Detail
                        </button>

                        {/* Enable/Disable Toggle Button */}
                        <button
                          onClick={() => handleToggleEnabled(p.entityType)}
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition ${
                            isEnabled
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                          title={isEnabled ? 'Click to disable rule' : 'Click to enable rule'}
                        >
                          {isEnabled ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeletePolicy(p.entityType)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition ml-1"
                          title="Delete entity rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. RIGHT SLIDE-OVER DRAWER: Entity Detail & Explanation */}
      <SlideOverDrawer
        isOpen={selectedPolicyForDetail !== null}
        onClose={() => setSelectedPolicyForDetail(null)}
        title={selectedPolicyForDetail ? `Entity Policy: ${selectedPolicyForDetail.entityType}` : ''}
        subtitle="Detailed behavior explanation and action details"
        footer={
          <button
            onClick={() => setSelectedPolicyForDetail(null)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            Close
          </button>
        }
      >
        {selectedPolicyForDetail && (
          <div className="space-y-5">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Description</span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedPolicyForDetail.description || 'No specific description provided for this entity rule.'}
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Current Action Details</span>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getActionBadgeColor(selectedPolicyForDetail.action, selectedPolicyForDetail.enabled)}`}>
                  {selectedPolicyForDetail.action}
                </span>
                <span className="text-xs text-slate-300">
                  {selectedPolicyForDetail.enabled !== false ? 'Currently Active' : 'Currently Disabled (Pass-through)'}
                </span>
              </div>

              <div className="text-xs text-slate-400 leading-relaxed pt-1">
                {selectedPolicyForDetail.action === 'TOKENIZE' && (
                  <span>
                    <strong>TOKENIZE:</strong> The detected entity text is replaced with a cryptographic ephemeral token (e.g. <code className="text-blue-400 font-mono">[a3x:{selectedPolicyForDetail.entityType}_001]</code>) before forwarding to the upstream LLM. The token is mapped in the Redis Token Vault and automatically restored to the original value in the response stream.
                  </span>
                )}
                {selectedPolicyForDetail.action === 'REDACT' && (
                  <span>
                    <strong>REDACT:</strong> The detected entity is permanently overwritten with <code className="text-yellow-400 font-mono">[REDACTED]</code>. The original value is not saved in the vault and cannot be restored.
                  </span>
                )}
                {selectedPolicyForDetail.action === 'BLOCK' && (
                  <span>
                    <strong>BLOCK:</strong> If this entity is detected anywhere in the request prompt, the proxy immediately terminates the request with HTTP 400 and does NOT contact the upstream provider.
                  </span>
                )}
                {selectedPolicyForDetail.action === 'PASS' && (
                  <span>
                    <strong>PASS:</strong> The entity is forwarded as plaintext without any modification or tokenization.
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Confidence Threshold</span>
              <div className="flex items-center justify-between text-xs text-slate-200">
                <span>Minimum NLP Detection Score:</span>
                <span className="font-mono text-blue-400 font-semibold">{((selectedPolicyForDetail.minScore ?? 0.7) * 100).toFixed(0)}%</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Any detection result with confidence score below this threshold will be treated as PASS.
              </p>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* 2. RIGHT SLIDE-OVER DRAWER: Add Entity Rule */}
      <SlideOverDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        title="Add New Entity Action Rule"
        subtitle="Define privacy actions for custom PII or domain-specific entities"
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
              onClick={handleAddPolicy}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
            >
              Stage Entity Rule
            </button>
          </>
        }
      >
        <form onSubmit={handleAddPolicy} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Entity Type</label>
            <input
              type="text"
              placeholder="e.g. PASSPORT_NUMBER or DRIVER_LICENSE"
              value={newEntity}
              onChange={(e) => setNewEntity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Privacy Action</label>
            <select
              value={newAction}
              onChange={(e) => setNewAction(e.target.value as PrivacyAction)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {ACTIONS.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
              <span>Confidence Threshold</span>
              <span className="font-mono text-blue-400 font-semibold">{((newScore) * 100).toFixed(0)}%</span>
            </div>
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

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Detailed explanation of what this entity identifies..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}
