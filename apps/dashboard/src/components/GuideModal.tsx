import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  KeyRound,
  EyeOff,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  Lock,
  Server,
  Zap,
  CheckCircle2,
  BookOpen,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Check,
  Terminal,
} from 'lucide-react';

interface GuideStep {
  title: string;
  badge: string;
  badgeColor: string;
  subtitle: string;
  content: React.ReactNode;
}

function AnimatedArchitectureFlow() {
  const [activeStage, setActiveStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const stages = [
    {
      id: 0,
      title: '1. Ingress (Client App / IDE)',
      shortTitle: 'Client Prompt',
      tag: 'Local Security Zone',
      tagColor: 'text-blue-400 bg-blue-950/60 border-blue-800/50',
      icon: Terminal,
      color: 'blue',
      glow: 'shadow-blue-500/20 border-blue-500/50 bg-blue-950/30',
      summary: 'Prompt with raw PII leaves your IDE or app',
      payloadLabel: 'Raw Payload (In Transit):',
      payload: 'Prompt: "Invoice for Alice Walker (alice@techcorp.com) with payment to 0x71C8F794..."',
      actionBadge: 'Raw Sensitive Data',
    },
    {
      id: 1,
      title: '2. Interception & Token Vault',
      shortTitle: 'Proxy Gateway',
      tag: 'AI Privacy Proxy',
      tagColor: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/50',
      icon: Shield,
      color: 'indigo',
      glow: 'shadow-indigo-500/20 border-indigo-500/50 bg-indigo-950/30',
      summary: 'Presidio NLP detects PII & stores tokens in Redis Vault',
      payloadLabel: 'Tokenized Ingress Payload:',
      payload: 'Prompt: "Invoice for [PREFIX:PERSON_001] ([PREFIX:EMAIL_001]) with payment to [PREFIX:CRYPTO_001]"',
      actionBadge: 'Presidio NER + Vault Storage',
    },
    {
      id: 2,
      title: '3. Upstream AI Cloud Inference',
      shortTitle: 'Cloud AI Model',
      tag: 'Public Cloud (OpenAI/Claude)',
      tagColor: 'text-purple-400 bg-purple-950/60 border-purple-800/50',
      icon: Cpu,
      color: 'purple',
      glow: 'shadow-purple-500/20 border-purple-500/50 bg-purple-950/30',
      summary: 'AI processes the request using anonymous tokens only',
      payloadLabel: 'Cloud AI Response (Tokens Only):',
      payload: 'Response: "I prepared the invoice for [PREFIX:PERSON_001] at [PREFIX:EMAIL_001]..."',
      actionBadge: 'Zero PII Leaked to Cloud',
    },
    {
      id: 3,
      title: '4. Real-time Stream Detokenization',
      shortTitle: 'Detokenizer & Egress',
      tag: 'Client Delivery',
      tagColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50',
      icon: Zap,
      color: 'emerald',
      glow: 'shadow-emerald-500/20 border-emerald-500/50 bg-emerald-950/30',
      summary: 'SSE response stream is detokenized back to original plaintext',
      payloadLabel: 'Final Delivered Plaintext:',
      payload: 'Response: "I prepared the invoice for Alice Walker at alice@techcorp.com..."',
      actionBadge: 'Seamless Plaintext Output',
    },
  ];

  // Auto-advance animation timer every 2.4s
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % stages.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [isPlaying, stages.length]);

  const current = stages[activeStage] || stages[0]!;

  return (
    <div className="space-y-4">
      {/* Animated Pipeline Stage Navigator */}
      <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 shadow-xl relative overflow-hidden">
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Interactive Flow Pipeline
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Auto-Playing
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-lg border border-slate-800 transition font-mono"
            >
              {isPlaying ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStage(0)}
              className="p-1 text-slate-400 hover:text-slate-200 bg-slate-900 rounded-lg border border-slate-800 transition"
              title="Restart from Stage 1"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 4 Connected Stages with Animated Flow Lines */}
        <div className="relative">
          {/* Main Stage Grid with Animated Connectors */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative z-10">
            {stages.map((st, idx) => {
              const Icon = st.icon;
              const isActive = activeStage === idx;
              const isPassed = activeStage > idx;

              return (
                <div key={st.id} className="relative flex flex-col">
                  {/* Stage Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStage(idx);
                      setIsPlaying(false);
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all duration-300 relative flex flex-col justify-between flex-1 ${
                      isActive
                        ? `${st.glow} ring-2 ring-blue-500/50 transform scale-[1.02]`
                        : isPassed
                        ? 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700'
                        : 'bg-slate-950 border-slate-850 text-slate-500 hover:border-slate-800'
                    }`}
                  >
                    {/* Active Pulsating Beacon */}
                    {isActive && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition ${
                          isActive
                            ? 'bg-blue-500/20 border-blue-400/40 text-blue-300 shadow-md shadow-blue-500/20'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">0{idx + 1}</span>
                      </div>

                      <div className={`font-semibold text-xs transition ${isActive ? 'text-slate-100' : 'text-slate-400'}`}>
                        {st.shortTitle}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[9px] font-mono text-slate-500 truncate">{st.actionBadge}</span>
                      {isPassed && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                    </div>
                  </button>

                  {/* Horizontal Connector Line for Desktop (between cards idx and idx+1) */}
                  {idx < stages.length - 1 && (
                    <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-0.5 z-20 pointer-events-none">
                      <div className={`w-full h-full rounded-full relative overflow-hidden ${
                        isActive ? 'bg-blue-500' : 'bg-slate-800'
                      }`}>
                        {/* Animated traveling data particle */}
                        {isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-200 to-transparent animate-pulse" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Animated Connecting Track Bar at Bottom */}
          <div className="mt-3 relative h-1 bg-slate-900 border border-slate-850 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${((activeStage + 1) / stages.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Dynamic Detail Card for the Currently Active Stage */}
        <div className="p-4 bg-slate-900/95 border border-slate-800 rounded-xl space-y-2.5 transition-all duration-300 shadow-inner">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100">{current.title}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${current.tagColor}`}>
                {current.tag}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-sans">{current.summary}</span>
          </div>

          <div>
            <div className="text-[10px] uppercase font-mono font-semibold text-slate-400 mb-1">
              {current.payloadLabel}
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-xs font-mono text-blue-300 break-all leading-relaxed">
              {current.payload}
            </div>
          </div>
        </div>
      </div>

      {/* Security Perimeter Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-1.5">
          <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-400" /> Inside Trusted Perimeter (Your Machine)
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Raw PII, real customer names, and cryptographic token mappings are strictly stored in your local <strong>Redis Token Vault</strong>. They never leave your network.
          </p>
        </div>

        <div className="p-3.5 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-1.5">
          <div className="font-semibold text-purple-300 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-purple-400" /> Outside Perimeter (Cloud AI Models)
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            The external AI provider (OpenAI / Claude / 9router) only ever receives anonymous tokens (e.g. <code>[PREFIX:PERSON_001]</code>). Zero secrets are exposed.
          </p>
        </div>
      </div>
    </div>
  );
}

export function GuideModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeStep, setActiveStep] = useState(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset to step 0 whenever reopened
  useEffect(() => {
    if (isOpen) setActiveStep(0);
  }, [isOpen]);

  const steps: GuideStep[] = [
    {
      title: '1. What is AI Privacy Proxy & Why Do We Need It?',
      badge: 'Introduction',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      subtitle: 'An automated security gateway between your applications and Cloud AI Providers (OpenAI, Anthropic, DeepSeek, Google, etc.)',
      content: (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <h4 className="font-semibold text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" /> The Core Problem with Cloud AI
            </h4>
            <p className="text-slate-400">
              When developers or applications send prompts containing customer data, invoice details, internal server logs, passwords, or API keys directly to third-party AI models, that sensitive data <strong>risks leakage, persistent cloud logging, or unintended model retraining</strong>.
            </p>
          </div>

          <div className="p-4 bg-blue-950/20 border border-blue-800/40 rounded-xl space-y-2">
            <h4 className="font-semibold text-blue-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" /> The Solution: AI Privacy Proxy
            </h4>
            <p className="text-slate-300">
              This proxy functions as a <strong>local / self-hosted middleman gateway</strong> that automatically:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-300">
              <li>Detects Personally Identifiable Information (PII) and secret credentials in prompts before they reach the internet.</li>
              <li>Replaces sensitive values with ephemeral, format-preserving <strong>Cryptographic Tokens</strong>.</li>
              <li>Restores original plaintext values seamlessly in real-time streaming LLM responses.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: '2. End-to-End Visual Architecture & Data Flow',
      badge: 'Interactive Flow',
      badgeColor: 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-blue-300 border-blue-500/30',
      subtitle: 'Animated visual breakdown of how prompts are intercepted, tokenized, computed, and detokenized',
      content: <AnimatedArchitectureFlow />,
    },
    {
      title: '3. Multi-Entity & Multi-Category Tokenization Workflow',
      badge: 'Deep Dive Scenario',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      subtitle: 'Real-world scenario featuring multiple Persons, distinct Emails, Crypto Wallets, and repeated references',
      content: (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Step 1: Incoming Complex Prompt */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-200">1. Original Client Prompt (Contains Multiple PII Items):</span>
              <span className="text-blue-400 font-mono text-[10px]">Client Input</span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono text-[11px] leading-relaxed">
              "Create an invoice for <span className="text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded">Alice Walker</span> (<span className="text-blue-400 bg-blue-950/60 px-1 py-0.5 rounded">alice@techcorp.com</span>) and her partner <span className="text-teal-400 bg-teal-950/60 px-1 py-0.5 rounded">Bob Smith</span> (<span className="text-indigo-400 bg-indigo-950/60 px-1 py-0.5 rounded">bob@partner.org</span>). Transfer 2.5 ETH to <span className="text-purple-400 bg-purple-950/60 px-1 py-0.5 rounded">0x71C8F794B32145429631994304244a1234567890</span> and CC <span className="text-blue-400 bg-blue-950/60 px-1 py-0.5 rounded">alice@techcorp.com</span>."
            </div>
          </div>

          {/* Step 2: Detection & Token Mapping Table */}
          <div className="p-3.5 bg-slate-950 border border-blue-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-blue-300">2. Presidio NLP & Token Vault Mapping:</span>
              <span className="text-blue-400 font-mono text-[10px]">Tokenization Mapping</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                <span className="text-slate-400">Alice Walker</span>
                <span className="text-emerald-400 font-semibold">➔ [PREFIX:PERSON_001]</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                <span className="text-slate-400">Bob Smith</span>
                <span className="text-teal-400 font-semibold">➔ [PREFIX:PERSON_002]</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                <span className="text-slate-400">alice@techcorp.com</span>
                <span className="text-blue-400 font-semibold">➔ [PREFIX:EMAIL_001]</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                <span className="text-slate-400">bob@partner.org</span>
                <span className="text-indigo-400 font-semibold">➔ [PREFIX:EMAIL_002]</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between sm:col-span-2">
                <span className="text-slate-400 truncate max-w-[180px]">0x71C8F794...7890</span>
                <span className="text-purple-400 font-semibold">➔ [PREFIX:ETHEREUM_ADDRESS_001]</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded border border-amber-900/40">
              💡 <strong>Smart Deduplication (Session Consistency):</strong> Because <code className="text-blue-300">alice@techcorp.com</code> is referenced twice, the proxy assigns the <strong>exact same token (<code className="text-blue-300">[PREFIX:EMAIL_001]</code>)</strong> so the AI accurately understands it refers to the same subject!
            </p>
          </div>

          {/* Step 3: Upstream Cloud AI Response */}
          <div className="p-3.5 bg-slate-950 border border-purple-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-purple-300">3. Sanitized Payload Received & Processed by Upstream AI:</span>
              <span className="text-purple-400 font-mono text-[10px]">Cloud AI Response</span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg text-purple-200 font-mono text-[11px] leading-relaxed">
              "Draft invoice generated for <span className="text-emerald-400">[PREFIX:PERSON_001]</span> and <span className="text-teal-400">[PREFIX:PERSON_002]</span>. Payment confirmation routed to <span className="text-blue-400">[PREFIX:EMAIL_001]</span> and <span className="text-indigo-400">[PREFIX:EMAIL_002]</span> with 2.5 ETH payout to <span className="text-purple-400">[PREFIX:ETHEREUM_ADDRESS_001]</span>."
            </div>
          </div>

          {/* Step 4: Final Reconstructed Response */}
          <div className="p-3.5 bg-slate-950 border border-emerald-900/50 rounded-xl space-y-2 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-emerald-300">4. Delivered to Client (Original Plaintext Seamlessly Restored):</span>
              <span className="text-emerald-400 font-mono text-[10px]">Stream Detokenized</span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg text-emerald-100 font-mono text-[11px] leading-relaxed">
              "Draft invoice generated for <strong className="text-emerald-300">Alice Walker</strong> and <strong className="text-teal-300">Bob Smith</strong>. Payment confirmation routed to <strong className="text-blue-300">alice@techcorp.com</strong> and <strong className="text-indigo-300">bob@partner.org</strong> with 2.5 ETH payout to <strong className="text-purple-300">0x71C8F794B32145429631994304244a1234567890</strong>."
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-400 text-[11px] space-y-1">
            <p>
              🔒 <strong>Key Takeaway:</strong> Upstream AI models (OpenAI/Anthropic) <strong>never see real names, emails, or crypto addresses</strong>, yet the output is 100% accurate with zero mixed-up entities!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: '4. Choosing Protection Actions (Privacy Actions)',
      badge: 'Action Rules',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      subtitle: '5 distinct protection actions you can configure per entity in Privacy Policies',
      content: (
        <div className="space-y-2.5 text-xs text-slate-300">
          <div className="p-3 bg-slate-950 border border-blue-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                TOKENIZE
              </span>
              <span className="font-semibold text-slate-200">Reversible Ephemeral Token (2-Way)</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Replaces plaintext with <code>[PREFIX:ENTITY_001]</code>. Saved in the Redis Vault and <strong>automatically restored to the original value</strong> in streaming responses. Ideal for Names, Emails, Phone Numbers, and Addresses.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-cyan-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                MASK
              </span>
              <span className="font-semibold text-slate-200">Format-Preserving Masking</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Partially obscures characters (e.g. <code>s***i@bitcoin.org</code>, <code>0x71C8...7890</code>, <code>****-****-****-9010</code>). Provides formatting hints to the AI without exposing raw data.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-yellow-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                REDACT
              </span>
              <span className="font-semibold text-slate-200">Permanent Redaction (1-Way)</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Permanently replaces sensitive text with <code>[REDACTED_ENTITY]</code>. The value is <strong>NOT saved in the vault</strong>, so it remains redacted in the response and is <strong>never restored to plaintext</strong> (unlike <code>TOKENIZE</code>).
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-red-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                BLOCK
              </span>
              <span className="font-semibold text-slate-200">Immediate Request Abort</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Immediately terminates the request with HTTP 400 Bad Request if forbidden secrets are detected (e.g. OpenAI API Keys, Root Passwords, Crypto Private Keys).
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-700 text-slate-300">
                PASS
              </span>
              <span className="font-semibold text-slate-200">Plaintext Passthrough</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Allows the entity to pass through raw without any transformation, masking, or tokenization.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: '5. Confidence Threshold (AI Detection Sensitivity)',
      badge: 'Detection Sensitivity',
      badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      subtitle: 'Configures how confident the AI model must be before applying protection actions',
      content: (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <h4 className="font-semibold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-400" /> What is Confidence Score (0% - 100%)?
            </h4>
            <p className="text-slate-400 leading-relaxed">
              When the NLP engine (Presidio / spaCy) inspects your prompt, it computes a <strong>probability confidence score</strong> (e.g. <code>0.85</code> or 85%) indicating how sure it is that a word matches that entity category.
            </p>
          </div>

          {/* Real World Example Card */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono text-[11px]">
            <div className="text-[11px] text-slate-400 font-sans font-semibold uppercase tracking-wider">
              Example of Why Confidence Scores Differ:
            </div>

            <div className="p-2.5 bg-slate-900 border border-slate-850 rounded-lg space-y-1">
              <div className="text-emerald-400 font-semibold font-sans">Case A (95% Score — Definite Match):</div>
              <div className="text-slate-300">"Send email to <strong>satoshi@bitcoin.org</strong>"</div>
              <div className="text-[10px] text-slate-400 font-sans">➔ Standard regex format and valid domain. AI is 95% confident this is an EMAIL_ADDRESS.</div>
            </div>

            <div className="p-2.5 bg-slate-900 border border-slate-850 rounded-lg space-y-1">
              <div className="text-amber-400 font-semibold font-sans">Case B (45% Score — Ambiguous):</div>
              <div className="text-slate-300">"I stayed at the <strong>Paris Hilton</strong> hotel"</div>
              <div className="text-[10px] text-slate-400 font-sans">➔ "Paris" could be a city (LOCATION) or part of a hotel/person name. AI is only 45% confident.</div>
            </div>
          </div>

          {/* Threshold Slider Logic Explanation */}
          <div className="p-4 bg-blue-950/20 border border-blue-800/40 rounded-xl space-y-2">
            <h4 className="font-semibold text-blue-200">
              💡 How the Threshold Slider Operates:
            </h4>
            <p className="text-slate-300">
              If you configure the threshold to <strong>75%</strong>:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
              <li>Entities with score <strong>≥ 75%</strong> are <strong>PROTECTED (Tokenized / Masked)</strong>.</li>
              <li>Entities with score <strong>&lt; 75%</strong> are <strong>PASSED THROUGH</strong> (ignored) to prevent false positives.</li>
            </ul>
          </div>

          {/* Recommendations Table */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="font-semibold text-purple-300">85% - 95% (Strict)</div>
              <p className="text-slate-400 text-[10px]">Only masks high-certainty matches. Completely prevents false positive censorship.</p>
            </div>
            <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-1">
              <div className="font-semibold text-emerald-300">70% - 80% (Recommended)</div>
              <p className="text-slate-400 text-[10px]">Optimal balance between data privacy security and prompt language naturalness.</p>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="font-semibold text-amber-300">30% - 50% (Aggressive)</div>
              <p className="text-slate-400 text-[10px]">Masks anything remotely suspected as sensitive (high-security paranoid mode).</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '6. Privacy Operating Modes (Strict / Balanced / Bypass)',
      badge: 'Operational Resilience',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      subtitle: 'Controls how the proxy responds if the Presidio NLP service or Redis experiences an outage',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3.5 bg-slate-950 border border-red-800/40 rounded-xl space-y-1.5">
            <div className="font-semibold text-red-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-red-400" /> STRICT (Fail-Closed — Maximum Security)
            </div>
            <p className="text-slate-400 text-[11px]">
              If Presidio NLP or the Redis Vault is unreachable, the proxy <strong>immediately aborts the request</strong>. Guarantees <em>zero data leakage</em> for enterprise compliance.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-blue-800/40 rounded-xl space-y-1.5">
            <div className="font-semibold text-blue-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-400" /> BALANCED (Fail-Open with Regex Fallback)
            </div>
            <p className="text-slate-400 text-[11px]">
              If Presidio NLP is offline or slow, the proxy automatically falls back to the <strong>built-in internal pattern engine</strong> to maintain privacy protection without disrupting client workflows.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-700 rounded-xl space-y-1.5">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-400" /> BYPASS (Direct Passthrough)
            </div>
            <p className="text-slate-400 text-[11px]">
              Temporarily disables privacy inspection. Requests and responses pass through unmodified with zero latency overhead.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: '7. Connecting Client Applications, Claude Code, & 9router',
      badge: 'Integration Guide',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      subtitle: 'Simply configure the Base URL in your client tools, IDEs, or SDKs',
      content: (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="text-[11px] font-semibold text-slate-200">Point Your Client API Base URL:</div>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="text-slate-500 line-through">
                Direct Provider URL: https://api.openai.com/v1 (or https://api.anthropic.com)
              </div>
              <div className="text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40">
                ➔ Privacy Proxy URL: http://localhost:3000/p/9router/v1
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <h4 className="font-semibold text-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-400" /> Transparent Client Auth Passthrough
            </h4>
            <p className="text-slate-400 text-[11px]">
              Headers such as <code>Authorization: Bearer sk-...</code> or <code>x-api-key</code> from clients are <strong>passed through transparently</strong> to your upstream provider (or 9router) without modification or logging.
            </p>
          </div>

          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Ready to go! Test and simulate policy transformations anytime in <strong>Privacy Policies ➔ Try Policy Playground</strong>.</span>
          </div>
        </div>
      ),
    },
  ];

  if (!isOpen) return null;

  const currentStep = steps[activeStep];
  if (!currentStep) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/50 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${currentStep.badgeColor}`}>
                {currentStep.badge}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Step {activeStep + 1} of {steps.length}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-100 tracking-tight">{currentStep.title}</h3>
            <p className="text-xs text-slate-400">{currentStep.subtitle}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {currentStep.content}
        </div>

        {/* Modal Footer with Progress Dots & Navigation */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between gap-4">
          {/* Step Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  activeStep === idx
                    ? 'w-6 bg-blue-500'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Open Step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {activeStep > 0 && (
              <button
                onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
            )}

            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 transition"
              >
                <CheckCircle2 className="w-4 h-4" /> Got it, Finish Guide
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
