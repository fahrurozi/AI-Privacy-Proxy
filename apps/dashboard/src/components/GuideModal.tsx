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
} from 'lucide-react';

interface GuideStep {
  title: string;
  badge: string;
  badgeColor: string;
  subtitle: string;
  content: React.ReactNode;
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
      title: '2. Multi-Entity & Multi-Category Tokenization Workflow',
      badge: 'Core Workflow',
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
      title: '3. Choosing Protection Actions (Privacy Actions)',
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
      title: '4. Confidence Threshold (AI Detection Sensitivity)',
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
      title: '5. Privacy Operating Modes (Strict / Balanced / Bypass)',
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
      title: '6. Connecting Client Applications, Claude Code, & 9router',
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
