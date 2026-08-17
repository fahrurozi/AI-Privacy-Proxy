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
      title: '1. Apa itu AI Privacy Proxy & Mengapa Kita Butuh?',
      badge: 'Introduction',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      subtitle: 'Gerbang pengaman otomatis antara aplikasi Anda dan AI Provider (OpenAI, Anthropic, DeepSeek, Google, dll.)',
      content: (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <h4 className="font-semibold text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" /> Masalah Utama Saat Berinteraksi dengan AI
            </h4>
            <p className="text-slate-400">
              Saat developer atau aplikasi mengirim prompt ke model LLM di cloud (misalnya data invoice, log server, data nasabah, password, atau API key), data sensitif tersebut <strong>berisiko bocor, dicatat di log server cloud, atau digunakan untuk pelatihan ulang model AI</strong>.
            </p>
          </div>

          <div className="p-4 bg-blue-950/20 border border-blue-800/40 rounded-xl space-y-2">
            <h4 className="font-semibold text-blue-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" /> Solusi: AI Privacy Proxy
            </h4>
            <p className="text-slate-300">
              Proxy ini bertindak sebagai <strong>perantara (*Middleman*) lokal / self-hosted</strong> yang secara otomatis:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-300">
              <li>Mendeteksi data pribadi (PII) dan rahasia sensitif dalam prompt sebelum keluar ke internet.</li>
              <li>Menyamarkan atau menukarnya dengan <strong>Token Kriptografis</strong> sementara.</li>
              <li>Mengembalikan data asli secara transparan saat AI menjawab (*streaming* respons).</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: '2. Cara Kerja Tokenization (Reversible Privacy)',
      badge: 'Core Workflow',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      subtitle: 'Bagaimana data disembunyikan dari AI tetapi tetap utuh di mata pengguna',
      content: (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Step-by-step Visual Diagram */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono">
            <div className="text-[11px] text-slate-400 font-sans font-semibold uppercase tracking-wider mb-1">
              Alur Perjalanan Data (End-to-End)
            </div>

            <div className="flex flex-col gap-2">
              {/* Step 1 */}
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                <span className="text-slate-400">1. Klien / IDE / App</span>
                <span className="text-blue-300 font-sans">"Kirim email ke <strong>satoshi@bitcoin.org</strong>"</span>
              </div>
              <div className="text-center text-slate-600">↓ (Masuk ke Privacy Proxy)</div>

              {/* Step 2 */}
              <div className="p-2.5 bg-blue-950/40 border border-blue-800/60 rounded-lg flex items-center justify-between">
                <span className="text-blue-300 font-semibold">2. Presidio NLP & Vault</span>
                <span className="text-yellow-300">"satoshi@bitcoin.org" ➔ <code className="text-blue-400">[PREFIX:EMAIL_001]</code></span>
              </div>
              <div className="text-center text-slate-600">↓ (Hanya Token yang dikirim ke Upstream Cloud)</div>

              {/* Step 3 */}
              <div className="p-2.5 bg-purple-950/30 border border-purple-800/50 rounded-lg flex items-center justify-between">
                <span className="text-purple-300">3. Upstream AI (OpenAI/Anthropic)</span>
                <span className="text-purple-200">Menjawab: "Saya sudah siapkan draf untuk <code className="text-purple-300">[PREFIX:EMAIL_001]</code>"</span>
              </div>
              <div className="text-center text-slate-600">↓ (Streaming Interceptor mengembalikan data asli)</div>

              {/* Step 4 */}
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg flex items-center justify-between">
                <span className="text-emerald-300 font-semibold">4. Diterima Pengguna</span>
                <span className="text-emerald-200 font-sans">"Saya sudah siapkan draf untuk <strong>satoshi@bitcoin.org</strong>"</span>
              </div>
            </div>
          </div>

          <p className="text-slate-400">
            💡 <strong>Keuntungan:</strong> Model AI upstream sama sekali <em>tidak pernah melihat</em> email atau data asli, namun konteks kalimat tetap berjalan normal!
          </p>
        </div>
      ),
    },
    {
      title: '3. Memilih Aksi Perlindungan (Privacy Actions)',
      badge: 'Action Rules',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      subtitle: 'Ada 5 jenis aksi yang bisa Anda terapkan pada setiap entitas di menu Privacy Policies',
      content: (
        <div className="space-y-2.5 text-xs text-slate-300">
          <div className="p-3 bg-slate-950 border border-blue-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                TOKENIZE
              </span>
              <span className="font-semibold text-slate-200">Reversible Ephemeral Token</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Mengganti teks dengan token <code>[PREFIX:ENTITY_001]</code>. Disimpan di Redis Vault dan <strong>otomatis dikembalikan ke teks asli</strong> saat AI menjawab secara streaming. Cocok untuk Nama, Email, Alamat, No Telepon.
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
              Menyamarkan sebagian karakter (contoh: <code>s***i@bitcoin.org</code> atau <code>0x71C8...7890</code>). Memberi AI petunjuk format data tanpa membocorkan isi data aslinya.
            </p>
          </div>

          <div className="p-3 bg-slate-950 border border-yellow-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                REDACT
              </span>
              <span className="font-semibold text-slate-200">Permanent Redaction</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Menghapus nilai asli dan menimpa dengan <code>[REDACTED_ENTITY]</code> secara permanen tanpa disimpan di vault.
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
              Membatalkan request seketika dengan pesan HTTP 400 Bad Request jika data terlarang ditemukan (contoh: API Key OpenAI, Password Root, Private Key Crypto).
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
              Mengizinkan teks diteruskan apa adanya tanpa sensor atau modifikasi token.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: '4. Privacy Operating Modes (Strict / Balanced / Bypass)',
      badge: 'Operational Resilience',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      subtitle: 'Mengatur bagaimana proxy bersikap jika layanan NLP atau Redis mengalami gangguan',
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3.5 bg-slate-950 border border-red-800/40 rounded-xl space-y-1.5">
            <div className="font-semibold text-red-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-red-400" /> STRICT (Fail-Closed — Paling Aman)
            </div>
            <p className="text-slate-400 text-[11px]">
              Jika Presidio NLP atau Redis Vault mati, proxy <strong>akan langsung menolak seluruh request</strong>. Menjamin <em>zero data leakage</em> untuk standar keamanan tinggi perbankan/enterprise.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-blue-800/40 rounded-xl space-y-1.5">
            <div className="font-semibold text-blue-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-400" /> BALANCED (Fail-Open with Fallback)
            </div>
            <p className="text-slate-400 text-[11px]">
              Jika Presidio NLP lambat atau offline, proxy otomatis beralih menggunakan <strong>Internal Regex Engine bawaan</strong> untuk tetap menyensor data tanpa membuat aplikasi klien terputus.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 border border-slate-700 rounded-xl space-y-1.5">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-400" /> BYPASS (Passthrough Murni)
            </div>
            <p className="text-slate-400 text-[11px]">
              Menonaktifkan deteksi privasi untuk sementara waktu. Request dan respons diteruskan langsung tanpa inspeksi atau latensi tambahan.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: '5. Cara Menghubungkan Aplikasi Klien & 9router',
      badge: 'Integration Guide',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      subtitle: 'Hanya perlu mengganti Base URL di aplikasi klien atau SDK Anda',
      content: (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="text-[11px] font-semibold text-slate-200">Ganti Endpoint API pada Klien Anda:</div>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="text-slate-500 line-through">
                Base URL Asli: https://api.openai.com/v1 (atau https://api.anthropic.com)
              </div>
              <div className="text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40">
                ➔ Base URL Proxy: http://localhost:3000/v1
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <h4 className="font-semibold text-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-400" /> Bagaimana dengan API Key Klien (9router / OpenAI)?
            </h4>
            <p className="text-slate-400 text-[11px]">
              Header otentikasi seperti <code>Authorization: Bearer sk-...</code> atau <code>x-api-key</code> dari klien <strong>diteruskan secara aman dan transparan (*transparent passthrough*)</strong> ke provider upstream (atau 9router) tanpa diubah.
            </p>
          </div>

          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Semua siap digunakan! Anda bisa mencoba simulasi di menu <strong>Privacy Policies ➔ Try Policy Playground</strong>.</span>
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
                Langkah {activeStep + 1} dari {steps.length}
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
                title={`Buka Langkah ${idx + 1}`}
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
                <ChevronLeft className="w-4 h-4" /> Kembali
              </button>
            )}

            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition"
              >
                Lanjut <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-600/20 transition"
              >
                <CheckCircle2 className="w-4 h-4" /> Selesai & Paham
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
