import React, { useEffect, useState, useMemo } from 'react';
import { EntityPolicy, PrivacyAction, CustomRecognizerConfig } from '@ai-privacy-proxy/shared';
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
  Play,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  FlaskConical,
  RefreshCw,
  ShieldAlert,
  Wand2,
  Code,
  EyeOff,
  Cpu,
} from 'lucide-react';

const ACTIONS: PrivacyAction[] = ['TOKENIZE', 'MASK', 'REDACT', 'BLOCK', 'PASS'];

const STANDARD_PRESIDIO_ENTITIES: Array<{ id: string; name: string; desc: string }> = [
  { id: 'LOCATION', name: 'LOCATION', desc: 'Geographical places, cities, countries, and physical addresses' },
  { id: 'DATE_TIME', name: 'DATE_TIME', desc: 'Absolute dates, times, and calendar timestamps' },
  { id: 'IBAN_CODE', name: 'IBAN_CODE', desc: 'International Bank Account Numbers (IBAN)' },
  { id: 'SWIFT_CODE', name: 'SWIFT_CODE', desc: 'Bank BIC / SWIFT routing identification codes' },
  { id: 'MEDICAL_LICENSE', name: 'MEDICAL_LICENSE', desc: 'Healthcare practitioner and physician license numbers' },
  { id: 'US_DRIVER_LICENSE', name: 'US_DRIVER_LICENSE', desc: 'Driver license identification numbers' },
  { id: 'TAX_ID', name: 'TAX_ID', desc: 'National Tax Identification Numbers (TIN / NPWP)' },
  { id: 'ORGANIZATION', name: 'ORGANIZATION', desc: 'Company, corporation, agency, and institution names' },
  { id: 'URL', name: 'URL', desc: 'Web addresses, endpoint links, and domains' },
  { id: 'US_BANK_NUMBER', name: 'US_BANK_NUMBER', desc: 'Bank account and routing numbers' },
  { id: 'US_ITIN', name: 'US_ITIN', desc: 'Individual Taxpayer Identification Number' },
  { id: 'SG_NRIC_FIN', name: 'SG_NRIC_FIN', desc: 'Singapore National Registration ID (NRIC/FIN)' },
  { id: 'IN_PAN', name: 'IN_PAN', desc: 'India Permanent Account Number (PAN)' },
  { id: 'IN_AADHAAR', name: 'IN_AADHAAR', desc: 'India 12-digit Aadhaar UID number' },
  { id: 'UK_NHS', name: 'UK_NHS', desc: 'UK National Health Service identity number' },
  { id: 'AU_MEDICARE', name: 'AU_MEDICARE', desc: 'Australia Medicare identity number' },
];

const SAMPLE_DATA: Record<string, string> = {
  EMAIL_ADDRESS: 'Please reach out to satoshi.nakamoto@bitcoin.org or ceo@anthropic.com regarding the proposal.',
  ETHEREUM_ADDRESS: 'Send test transaction to 0x71C8F794B32145429631994304244a1234567890 on mainnet.',
  SOLANA_ADDRESS: 'My wallet public key is 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM on Solana.',
  PHONE_NUMBER: 'You can contact Dr. Johnson at +1 (555) 234-5678 or mobile 0812-9876-5432.',
  PERSON: 'The audit report was signed by Alice Walker, Alan Walker, and Robert Downey yesterday.',
  IP_ADDRESS: 'Internal proxy cluster is listening on 192.168.1.50 and gateway 10.0.0.1.',
  CREDIT_CARD: 'Charge card 4532-1234-5678-9010 with expiration date 12/28.',
  API_KEY: 'My API key is sk-proj-1234567890abcdef1234567890abcdef and AWS key AKIAIOSFODNN7EXAMPLE.',
  PASSWORD: 'The root database password is SuperSecretAdminPass2026!.',
  PRIVATE_KEY: 'Export private key 0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d.',
  SEED_PHRASE: 'seed phrase: apple banana cherry dog elephant fox grape horse igloo jaguar kangaroo lemon',
  US_SSN: 'Citizen identifier record SSN 000-12-3456.',
  US_PASSPORT: 'Passport verification document A12345678.',
  LOCATION: 'Server deployment in Jakarta, Singapore, and New York data centers.',
  DATE_TIME: 'System scheduled maintenance on August 25, 2026 at 14:30 UTC.',
};

function clientMask(val: string): string {
  if (!val || val.length <= 2) return '*'.repeat(val.length || 1);
  if (val.includes('@')) {
    const parts = val.split('@');
    const user = parts[0] || '';
    const domain = parts[1] || '';
    const maskedUser = user.length <= 2 ? `${user[0]}*` : `${user[0]}***${user[user.length - 1]}`;
    return `${maskedUser}@${domain}`;
  }
  if (val.startsWith('0x') && val.length >= 10) {
    return `${val.slice(0, 6)}...${val.slice(-4)}`;
  }
  if (val.length >= 32 && !val.includes(' ')) {
    return `${val.slice(0, 4)}...${val.slice(-4)}`;
  }
  const digitsOnly = val.replace(/\D/g, '');
  if (digitsOnly.length >= 10 && digitsOnly.length <= 19) {
    return `****-****-****-${digitsOnly.slice(-4)}`;
  }
  if (/^[\d+\-\s()]{7,}$/.test(val) && val.length > 6) {
    return `${val.slice(0, 3)}****${val.slice(-3)}`;
  }
  return val
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? `${w[0]}*` : `${w[0]}***${w[w.length - 1]}`))
    .join(' ');
}

// Client-side regex simulation helpers for instant UI preview
function simulatePolicyTransformation(
  text: string,
  policies: EntityPolicy[],
): {
  transformedText: string;
  detectedEntities: Array<{ entityType: string; matchedText: string; action: PrivacyAction }>;
  blocked: boolean;
  blockedEntities: string[];
} {
  const detected: Array<{ entityType: string; matchedText: string; action: PrivacyAction }> = [];
  const blockedEntities: string[] = [];
  let resultText = text;

  // Patterns for instant client-side testing (including generic capitalized names)
  const regexMap: Record<string, RegExp> = {
    EMAIL_ADDRESS: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    ETHEREUM_ADDRESS: /\b0x[a-fA-F0-9]{40}\b/g,
    SOLANA_ADDRESS: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
    PHONE_NUMBER: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b08\d{2}[-.\s]?\d{4}[-.\s]?\d{3,4}\b/g,
    IP_ADDRESS: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    CREDIT_CARD: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b|\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/g,
    API_KEY: /\b(?:sk-[a-zA-Z0-9_-]{20,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36})\b/g,
    PASSWORD: /(?:password|passwd|pwd)\s*[:=]\s*['"]?([^\s'"]+)['"]?/gi,
    PRIVATE_KEY: /\b(?:0x)?[a-fA-F0-9]{64}\b/g,
    // Generalized multi-word capitalized person names
    PERSON: /\b(?:Dr\.|Mr\.|Mrs\.|Ms\.)?\s*([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})+)\b/g,
    US_SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
    LOCATION: /\b(?:Jakarta|Singapore|New York|London|Tokyo|California|Bali|Surabaya|Bandung)\b/g,
  };

  const policyMap = new Map(policies.map((p) => [p.entityType.toUpperCase(), p]));
  let counter = 1;

  for (const [entityType, pattern] of Object.entries(regexMap)) {
    const policy = policyMap.get(entityType);
    if (!policy || policy.enabled === false) continue;

    const matches = Array.from(text.matchAll(pattern));
    for (const m of matches) {
      const matchVal = m[1] || m[0];
      if (!matchVal) continue;

      detected.push({
        entityType,
        matchedText: matchVal,
        action: policy.action,
      });

      if (policy.action === 'BLOCK') {
        if (!blockedEntities.includes(entityType)) blockedEntities.push(entityType);
      } else if (policy.action === 'REDACT') {
        resultText = resultText.replaceAll(matchVal, `[REDACTED_${entityType}]`);
      } else if (policy.action === 'MASK') {
        resultText = resultText.replaceAll(matchVal, clientMask(matchVal));
      } else if (policy.action === 'TOKENIZE') {
        const pad = String(counter++).padStart(3, '0');
        const token = `[PREFIX:${entityType}_${pad}]`;
        resultText = resultText.replaceAll(matchVal, token);
      }
    }
  }

  return {
    transformedText: blockedEntities.length > 0 ? '' : resultText,
    detectedEntities: detected,
    blocked: blockedEntities.length > 0,
    blockedEntities,
  };
}

export function PolicyPage() {
  const [policies, setPolicies] = useState<EntityPolicy[]>([]);
  const [customRecognizers, setCustomRecognizers] = useState<CustomRecognizerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Detail Drawer State with Live Playground
  const [selectedPolicyForDetail, setSelectedPolicyForDetail] = useState<EntityPolicy | null>(null);
  const [detailTestInput, setDetailTestInput] = useState('');
  const [detailBackendResult, setDetailBackendResult] = useState<any>(null);

  // Global Sandbox Drawer State
  const [showGlobalPlayground, setShowGlobalPlayground] = useState(false);
  const [globalTestInput, setGlobalTestInput] = useState(
    'Please send 1.5 ETH from satoshi@bitcoin.org to 0x71C8F794B32145429631994304244a1234567890. Signed by Alice Walker and Alan Walker.'
  );
  const [globalBackendResult, setGlobalBackendResult] = useState<any>(null);

  // Add Entity Drawer State
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [entitySource, setEntitySource] = useState<'presidio' | 'custom'>('presidio');
  const [customMode, setCustomMode] = useState<'existing' | 'new'>('existing');
  
  // Form fields
  const [newEntity, setNewEntity] = useState('LOCATION');
  const [newAction, setNewAction] = useState<PrivacyAction>('MASK');
  const [newScore, setNewScore] = useState(0.75);
  const [newDesc, setNewDesc] = useState(STANDARD_PRESIDIO_ENTITIES[0]?.desc || '');
  
  // New Custom Regex fields
  const [newCustomRecName, setNewCustomRecName] = useState('');
  const [newCustomPattern, setNewCustomPattern] = useState('');
  const [newCustomTestText, setNewCustomTestText] = useState('Test text with sample value 1234567890123456');

  const loadData = async () => {
    try {
      setLoading(true);
      const [policyData, recData] = await Promise.all([
        fetchApi<{ policies: EntityPolicy[] }>('/admin/policy'),
        fetchApi<{ custom: CustomRecognizerConfig[] }>('/admin/recognizers').catch(() => ({ custom: [] })),
      ]);
      setPolicies(policyData.policies);
      const customList = recData.custom || [];
      setCustomRecognizers(customList);
      if (customList.length === 0) {
        setCustomMode('new');
      }
    } catch (err: any) {
      setStatusMessage({ text: `Failed to load policies: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Debounced Real Presidio NLP Server Simulation for Single-Entity Detail
  useEffect(() => {
    if (!selectedPolicyForDetail || !detailTestInput.trim()) {
      setDetailBackendResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetchApi<any>('/admin/policy/simulate', {
          method: 'POST',
          body: JSON.stringify({
            text: detailTestInput,
            policies: [selectedPolicyForDetail],
          }),
        });
        setDetailBackendResult(res);
      } catch {
        // Fall back to client simulation
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedPolicyForDetail, detailTestInput]);

  // Debounced Real Presidio NLP Server Simulation for Global Sandbox
  useEffect(() => {
    if (!globalTestInput.trim()) {
      setGlobalBackendResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetchApi<any>('/admin/policy/simulate', {
          method: 'POST',
          body: JSON.stringify({
            text: globalTestInput,
            policies,
          }),
        });
        setGlobalBackendResult(res);
      } catch {
        // Fall back to client simulation
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [globalTestInput, policies]);

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

  const handleSourceChange = (source: 'presidio' | 'custom') => {
    setEntitySource(source);
    if (source === 'presidio') {
      const first = STANDARD_PRESIDIO_ENTITIES[0];
      if (first) {
        setNewEntity(first.name);
        setNewDesc(first.desc);
      }
    } else {
      if (customRecognizers.length > 0) {
        setCustomMode('existing');
        const first = customRecognizers[0];
        if (first) {
          setNewEntity(first.entityType);
          setNewDesc(`Custom pattern rule "${first.name}"`);
        }
      } else {
        setCustomMode('new');
        setNewEntity('NIK_KTP');
        setNewCustomRecName('KTP_Indonesia');
        setNewCustomPattern('\\b\\d{16}\\b');
        setNewDesc('Indonesian 16-digit national identification number');
      }
    }
  };

  const handlePresidioEntitySelect = (entityId: string) => {
    const found = STANDARD_PRESIDIO_ENTITIES.find((p) => p.id === entityId);
    if (found) {
      setNewEntity(found.name);
      setNewDesc(found.desc);
    }
  };

  const handleCustomEntitySelect = (entityTypeVal: string) => {
    const found = customRecognizers.find((c) => c.entityType === entityTypeVal);
    if (found) {
      setNewEntity(found.entityType);
      setNewDesc(`Custom pattern rule "${found.name}" (${found.pattern})`);
    } else {
      setNewEntity(entityTypeVal);
    }
  };

  // Live Regex Match Tester for New Pattern Creation inside Drawer
  const liveRegexMatches = useMemo(() => {
    if (!newCustomPattern || !newCustomTestText) return [];
    try {
      const re = new RegExp(newCustomPattern, 'g');
      return Array.from(newCustomTestText.matchAll(re)).map((m) => m[0]);
    } catch {
      return [];
    }
  }, [newCustomPattern, newCustomTestText]);

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntity.trim()) return;
    const upper = newEntity.trim().toUpperCase().replace(/\s+/g, '_');

    if (policies.some((p) => p.entityType === upper)) {
      setStatusMessage({ text: `Entity rule for "${upper}" already exists in your policy table.`, type: 'error' });
      return;
    }

    // If creating a brand new regex pattern, register it with Presidio first!
    if (entitySource === 'custom' && customMode === 'new') {
      if (!newCustomPattern.trim()) {
        setStatusMessage({ text: 'Please enter a valid Regular Expression pattern.', type: 'error' });
        return;
      }
      try {
        new RegExp(newCustomPattern);
      } catch (err: any) {
        setStatusMessage({ text: `Invalid Regular Expression: ${err.message}`, type: 'error' });
        return;
      }

      try {
        const recName = newCustomRecName.trim() || `${upper}_RECOGNIZER`;
        await fetchApi('/admin/recognizers', {
          method: 'POST',
          body: JSON.stringify({
            name: recName,
            entityType: upper,
            pattern: newCustomPattern.trim(),
            score: newScore,
            enabled: true,
          }),
        });
      } catch (err: any) {
        setStatusMessage({ text: `Failed to register custom recognizer: ${err.message}`, type: 'error' });
        return;
      }
    }

    const newRule: EntityPolicy = {
      entityType: upper,
      action: newAction,
      minScore: newScore,
      enabled: true,
      description: newDesc.trim() || 'Custom entity protection rule.',
    };

    const updatedPolicies = [...policies, newRule];
    setPolicies(updatedPolicies);
    setShowAddDrawer(false);

    // Auto-save and apply immediately so it's fully active
    try {
      await fetchApi('/admin/policy', {
        method: 'PUT',
        body: JSON.stringify({ policies: updatedPolicies }),
      });
      setStatusMessage({ text: `Entity rule "${upper}" created and activated!`, type: 'success' });
      loadData();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ text: `Entity staged but failed to apply: ${err.message}`, type: 'error' });
    }
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

  // When opening a detail drawer, set default sample text
  const openDetailDrawer = (policy: EntityPolicy) => {
    setSelectedPolicyForDetail(policy);
    setDetailTestInput(SAMPLE_DATA[policy.entityType] || `Sample testing prompt containing sensitive ${policy.entityType}.`);
  };

  // Active Simulation Result (Preferred: Server Presidio NLP result, Fallback: Client-side regex)
  const activeDetailSimulation = useMemo(() => {
    if (detailBackendResult) return detailBackendResult;
    if (!selectedPolicyForDetail || !detailTestInput) {
      return { transformedText: '', detectedEntities: [], blocked: false, blockedEntities: [] };
    }
    return simulatePolicyTransformation(detailTestInput, [selectedPolicyForDetail]);
  }, [detailBackendResult, selectedPolicyForDetail, detailTestInput]);

  const activeGlobalSimulation = useMemo(() => {
    if (globalBackendResult) return globalBackendResult;
    if (!globalTestInput) {
      return { transformedText: '', detectedEntities: [], blocked: false, blockedEntities: [] };
    }
    return simulatePolicyTransformation(globalTestInput, policies);
  }, [globalBackendResult, globalTestInput, policies]);

  const getActionBadgeColor = (action: PrivacyAction, enabled?: boolean) => {
    if (enabled === false) {
      return 'bg-slate-800 text-slate-500 border-slate-700';
    }
    switch (action) {
      case 'TOKENIZE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'MASK':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
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
      {/* Top Header with Global Playground Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Privacy Policy Settings</h1>
          <p className="text-sm text-slate-400">
            Define real-time protection actions (TOKENIZE, MASK, REDACT, BLOCK, PASS) per detected entity type.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Global Playground Trigger */}
          <button
            onClick={() => setShowGlobalPlayground(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-600/90 to-blue-600/90 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-500/20 border border-indigo-400/30 transition"
          >
            <FlaskConical className="w-4 h-4 text-indigo-200" /> Try Policy Playground
          </button>

          <button
            onClick={() => {
              handleSourceChange('presidio');
              setShowAddDrawer(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            <Plus className="w-4 h-4" /> Add Entity Rule
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
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

                    {/* Actions Column: Enable/Disable on LEFT, then Detail, then Delete */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* 1. Enable/Disable Toggle Button (ON LEFT) */}
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
                          <span>{isEnabled ? 'Enabled' : 'Disabled'}</span>
                        </button>

                        {/* 2. Detail Button (TO THE RIGHT OF ENABLE/DISABLE) */}
                        <button
                          onClick={() => openDetailDrawer(p)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                          title="View entity details, behavior explanation, and test playground"
                        >
                          <Info className="w-3.5 h-3.5 text-blue-400" /> Detail
                        </button>

                        {/* 3. Delete Button */}
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

      {/* 1. RIGHT SLIDE-OVER DRAWER: Entity Detail with Interactive Playground */}
      <SlideOverDrawer
        isOpen={selectedPolicyForDetail !== null}
        onClose={() => setSelectedPolicyForDetail(null)}
        title={selectedPolicyForDetail ? `Entity Policy: ${selectedPolicyForDetail.entityType}` : ''}
        subtitle="Detailed behavior explanation & interactive live sandbox"
        widthClass="max-w-xl"
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
            {/* Description Card */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Description & Pattern Scope</span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedPolicyForDetail.description || 'No specific description provided for this entity rule.'}
              </p>
            </div>

            {/* Action Card */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Current Action Details</span>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getActionBadgeColor(selectedPolicyForDetail.action, selectedPolicyForDetail.enabled)}`}>
                  {selectedPolicyForDetail.action}
                </span>
                <span className="text-xs text-slate-300">
                  {selectedPolicyForDetail.enabled !== false ? 'Rule is Enabled' : 'Rule is Disabled (Passing plaintext)'}
                </span>
              </div>

              <div className="text-xs text-slate-400 leading-relaxed pt-1">
                {selectedPolicyForDetail.action === 'TOKENIZE' && (
                  <span>
                    <strong>TOKENIZE:</strong> The detected entity is replaced with an ephemeral token (e.g. <code className="text-blue-400 font-mono">[PREFIX:{selectedPolicyForDetail.entityType}_001]</code>) and automatically restored to the original plaintext in LLM responses.
                  </span>
                )}
                {selectedPolicyForDetail.action === 'MASK' && (
                  <span>
                    <strong>MASK (Masking):</strong> Partially obscures characters while preserving format hints (e.g. <code className="text-cyan-400 font-mono">s***i@bitcoin.org</code>, <code className="text-cyan-400 font-mono">0x71C8...7890</code>, <code className="text-cyan-400 font-mono">****-****-****-9010</code>). Protects data while maintaining readability context without storing in the vault.
                  </span>
                )}
                {selectedPolicyForDetail.action === 'REDACT' && (
                  <span>
                    <strong>REDACT (1-Way Permanent):</strong> The detected entity is permanently masked with <code className="text-yellow-400 font-mono">[REDACTED_{selectedPolicyForDetail.entityType}]</code>. The original value is <strong>not saved in the vault</strong>, so it remains redacted in the response and is <strong>never restored to the original plaintext</strong>.
                  </span>
                )}
                {selectedPolicyForDetail.action === 'BLOCK' && (
                  <span>
                    <strong>BLOCK:</strong> If this entity is detected in the prompt, the request is immediately terminated with HTTP 400 without contacting the AI upstream.
                  </span>
                )}
                {selectedPolicyForDetail.action === 'PASS' && (
                  <span>
                    <strong>PASS:</strong> The entity is forwarded as plaintext without any modification or tokenization.
                  </span>
                )}
              </div>
            </div>

            {/* Interactive Single-Entity Playground */}
            <div className="p-4 bg-slate-950 border border-indigo-900/50 rounded-xl space-y-3 shadow-lg shadow-indigo-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-indigo-400" /> Interactive Entity Playground
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-emerald-400" /> spaCy NLP Active
                  </span>
                  {SAMPLE_DATA[selectedPolicyForDetail.entityType] && (
                    <button
                      type="button"
                      onClick={() => setDetailTestInput(SAMPLE_DATA[selectedPolicyForDetail.entityType] || '')}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Load Preset
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Input Sample Prompt</label>
                <textarea
                  rows={3}
                  value={detailTestInput}
                  onChange={(e) => setDetailTestInput(e.target.value)}
                  placeholder="Enter sample prompt containing this entity..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Simulation Result Box */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Transformation Result:</span>
                  <span className="font-mono">
                    Matches: <strong className="text-indigo-300">{activeDetailSimulation.detectedEntities.length}</strong>
                  </span>
                </div>

                {activeDetailSimulation.blocked ? (
                  <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Request Terminated (400 Bad Request):</strong> Sensitive entity <code className="font-mono">{selectedPolicyForDetail.entityType}</code> triggered the BLOCK policy rule.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 break-all">
                    {activeDetailSimulation.transformedText || detailTestInput}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* 2. RIGHT SLIDE-OVER DRAWER: Global Policy Playground */}
      <SlideOverDrawer
        isOpen={showGlobalPlayground}
        onClose={() => setShowGlobalPlayground(false)}
        title="Privacy Policy Sandbox Playground"
        subtitle="Simulate multi-entity detection, tokenization, masking, redaction, and blocking in real-time"
        widthClass="max-w-2xl"
        footer={
          <button
            onClick={() => setShowGlobalPlayground(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            Close Sandbox
          </button>
        }
      >
        <div className="space-y-5">
          {/* Preset Prompts Buttons */}
          <div className="space-y-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Quick Test Templates</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setGlobalTestInput(
                    'Invoice for Satoshi Nakamoto (satoshi@bitcoin.org). Payout 2.5 ETH to 0x71C8F794B32145429631994304244a1234567890. Signed by Alice Walker and Alan Walker.'
                  )
                }
                className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
              >
                💼 Mixed Invoice & Crypto
              </button>
              <button
                type="button"
                onClick={() =>
                  setGlobalTestInput(
                    'Deploying server at 192.168.1.100. Admin password SuperSecret123! with API key sk-proj-1234567890abcdef1234567890abcdef.'
                  )
                }
                className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
              >
                🔐 Dev Secrets & Credentials
              </button>
              <button
                type="button"
                onClick={() =>
                  setGlobalTestInput(
                    'Customer John Doe (john.doe@gmail.com) paid with Visa card 4532-1234-5678-9010 on cluster 10.0.0.1 in Jakarta.'
                  )
                }
                className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
              >
                💳 Payment & Personal PII
              </button>
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">Incoming Raw User Prompt (Client Side)</label>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <Cpu className="w-3 h-3 text-emerald-400" /> Connected to Presidio Engine
              </span>
            </div>
            <textarea
              rows={4}
              value={globalTestInput}
              onChange={(e) => setGlobalTestInput(e.target.value)}
              placeholder="Paste or type any prompt with PII/secrets to test all policy rules..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Detected Entities Tags */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Detected Entities in Prompt:</span>
              <span className="font-mono text-slate-400">Total: {activeGlobalSimulation.detectedEntities.length}</span>
            </div>

            {activeGlobalSimulation.detectedEntities.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {activeGlobalSimulation.detectedEntities.map((d: any, i: number) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border ${getActionBadgeColor(d.action)}`}
                  >
                    <span className="font-semibold">{d.entityType}</span>
                    <span className="text-slate-300">"{d.matchedText}"</span>
                    <span className="text-[10px] text-slate-400">({d.action})</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No sensitive entities detected under current active policy rules.</div>
            )}
          </div>

          {/* Sanitized LLM Payload Output */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Sanitized Payload (What the Upstream LLM Receives)</span>
              {activeGlobalSimulation.blocked && (
                <span className="text-xs text-red-400 font-semibold font-mono">STATUS: BLOCKED</span>
              )}
            </label>

            {activeGlobalSimulation.blocked ? (
              <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-red-300">
                  <ShieldAlert className="w-4 h-4 text-red-400" /> Request Intercepted & Blocked
                </div>
                <p className="text-[11px] text-red-300/80 leading-relaxed">
                  Contains blocked entities: <code className="font-mono font-bold text-red-200">{activeGlobalSimulation.blockedEntities.join(', ')}</code>. The proxy returned 400 Bad Request to protect credentials.
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-blue-300 leading-relaxed break-all">
                {activeGlobalSimulation.transformedText || globalTestInput}
              </div>
            )}
          </div>
        </div>
      </SlideOverDrawer>

      {/* 3. RIGHT SLIDE-OVER DRAWER: Add Entity Rule (2 Sources with Integrated Regex Creator) */}
      <SlideOverDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        title="Add Entity Action Rule"
        subtitle="Select an AI entity library or define custom pattern regex"
        widthClass="max-w-xl"
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
              disabled={!newEntity.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              Save & Activate Rule
            </button>
          </>
        }
      >
        <form onSubmit={handleAddPolicy} className="space-y-5">
          {/* 1. Two-Way Source Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">1. Choose Entity Detector Source</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSourceChange('presidio')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                  entitySource === 'presidio'
                    ? 'bg-blue-600/15 border-blue-500 text-blue-300 ring-1 ring-blue-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200 mb-1">
                  <Wand2 className="w-3.5 h-3.5 text-blue-400" /> Presidio AI Library
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">Built-in NLP language model</span>
              </button>

              <button
                type="button"
                onClick={() => handleSourceChange('custom')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                  entitySource === 'custom'
                    ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200 mb-1">
                  <Code className="w-3.5 h-3.5 text-indigo-400" /> Custom Pattern Regex
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">Existing or new pattern matcher</span>
              </button>
            </div>
          </div>

          {/* 2. Source Configuration */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            {entitySource === 'presidio' ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  2. Select Presidio AI Entity Type
                </label>
                <select
                  value={newEntity}
                  onChange={(e) => handlePresidioEntitySelect(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-blue-300 font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {STANDARD_PRESIDIO_ENTITIES.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name} — {ent.desc.slice(0, 48)}...
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                  {newDesc}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">2. Custom Pattern Option</label>
                  {customRecognizers.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomMode('existing');
                          const first = customRecognizers[0];
                          if (first) {
                            setNewEntity(first.entityType);
                            setNewDesc(`Custom pattern rule "${first.name}"`);
                          }
                        }}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] border transition ${
                          customMode === 'existing'
                            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        Choose Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomMode('new');
                          setNewEntity('NIK_KTP');
                          setNewCustomRecName('KTP_Indonesia');
                          setNewCustomPattern('\\b\\d{16}\\b');
                          setNewDesc('Indonesian 16-digit national ID');
                        }}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] border transition ${
                          customMode === 'new'
                            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        + Create New Regex
                      </button>
                    </div>
                  )}
                </div>

                {customMode === 'existing' && customRecognizers.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={newEntity}
                      onChange={(e) => handleCustomEntitySelect(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {customRecognizers.map((rec) => (
                        <option key={rec.id || rec.name} value={rec.entityType}>
                          {rec.entityType} ({rec.name}) — Pattern: {rec.pattern}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                      {newDesc}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Entity Type Name <span className="text-slate-500">(UPPERCASE Identifier)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. NIK_KTP or PROJECT_CODE"
                        value={newEntity}
                        onChange={(e) => setNewEntity(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Recognizer Display Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Indonesian KTP Number"
                        value={newCustomRecName}
                        onChange={(e) => setNewCustomRecName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Regex Pattern (How the proxy detects this text)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. \\b\\d{16}\\b"
                        value={newCustomPattern}
                        onChange={(e) => setNewCustomPattern(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    {/* Instant Live Match Box */}
                    <div className="p-3 bg-slate-900/80 border border-slate-850 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-slate-300">
                          <Play className="w-3 h-3 text-emerald-400" /> Live Pattern Test
                        </span>
                        <span>Matches: <strong className="text-emerald-400 font-mono">{liveRegexMatches.length}</strong></span>
                      </div>
                      <input
                        type="text"
                        value={newCustomTestText}
                        onChange={(e) => setNewCustomTestText(e.target.value)}
                        placeholder="Type test sample here..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                      />
                      {liveRegexMatches.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {liveRegexMatches.map((m, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Action Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">3. Protection Action</label>
            <select
              value={newAction}
              onChange={(e) => setNewAction(e.target.value as PrivacyAction)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {ACTIONS.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* 4. Confidence Threshold Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <span>4. Confidence Threshold</span>
              <span className="font-mono text-blue-400 font-bold">{((newScore) * 100).toFixed(0)}%</span>
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

          {/* 5. Description Textarea */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">5. Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Detailed explanation of what this entity rule identifies..."
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
