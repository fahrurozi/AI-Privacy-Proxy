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
      title: '2. Cara Kerja Tokenization Multi-Entitas & Multi-Kategori',
      badge: 'Core Workflow',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      subtitle: 'Skenario nyata dengan >1 Nama, >1 Email berbeda, Dompet Kripto, dan penyebutan ulang',
      content: (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Step 1: Incoming Complex Prompt */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-200">1. Prompt Asli dari Klien / IDE (Mengandung Banyak PII):</span>
              <span className="text-blue-400 font-mono text-[10px]">Client Input</span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 font-mono text-[11px] leading-relaxed">
              "Buatkan invoice untuk <span className="text-emerald-400 bg-emerald-950/60 px-1 py-0.5 rounded">Alice Walker</span> (<span className="text-blue-400 bg-blue-950/60 px-1 py-0.5 rounded">alice@techcorp.com</span>) dan partnernya <span className="text-teal-400 bg-teal-950/60 px-1 py-0.5 rounded">Bob Smith</span> (<span className="text-indigo-400 bg-indigo-950/60 px-1 py-0.5 rounded">bob@partner.org</span>). Transfer 2.5 ETH ke <span className="text-purple-400 bg-purple-950/60 px-1 py-0.5 rounded">0x71C8F794B32145429631994304244a1234567890</span> lalu kirim salinan lagi ke <span className="text-blue-400 bg-blue-950/60 px-1 py-0.5 rounded">alice@techcorp.com</span>."
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
              💡 <strong>Deduplikasi Cerdas:</strong> Karena <code className="text-blue-300">alice@techcorp.com</code> disebut 2 kali, proxy otomatis memberikan token yang <strong>sama persis (<code className="text-blue-300">[PREFIX:EMAIL_001]</code>)</strong> sehingga AI memahami bahwa orangnya sama!
            </p>
          </div>

          {/* Step 3: Upstream Cloud AI Response */}
          <div className="p-3.5 bg-slate-950 border border-purple-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-purple-300">3. Yang Diterima & Dijawab oleh AI Upstream (Cloud):</span>
              <span className="text-purple-400 font-mono text-[10px]">Cloud AI Response</span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg text-purple-200 font-mono text-[11px] leading-relaxed">
              "Invoice draf telah dibuat untuk <span className="text-emerald-400">[PREFIX:PERSON_001]</span> dan <span className="text-teal-400">[PREFIX:PERSON_002]</span>. Konfirmasi pembayaran dikirim ke <span className="text-blue-400">[PREFIX:EMAIL_001]</span> dan <span className="text-indigo-400">[PREFIX:EMAIL_002]</span>, dengan instruksi transfer 2.5 ETH ke dompet <span className="text-purple-400">[PREFIX:ETHEREUM_ADDRESS_001]</span>."
            </div>
          </div>

          {/* Step 4: Final Reconstructed Response */}
          <div className="p-3.5 bg-slate-950 border border-emerald-900/50 rounded-xl space-y-2 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-emerald-300">4. Yang Diterima Klien Pengguna (Data Asli Dikembalikan Sempurna):</span>
              <span className="text-emerald-400 font-mono text-[10px]">Stream Detokenized</span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg text-emerald-100 font-mono text-[11px] leading-relaxed">
              "Invoice draf telah dibuat untuk <strong className="text-emerald-300">Alice Walker</strong> dan <strong className="text-teal-300">Bob Smith</strong>. Konfirmasi pembayaran dikirim ke <strong className="text-blue-300">alice@techcorp.com</strong> dan <strong className="text-indigo-300">bob@partner.org</strong>, dengan instruksi transfer 2.5 ETH ke dompet <strong className="text-purple-300">0x71C8F794B32145429631994304244a1234567890</strong>."
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-400 text-[11px] space-y-1">
            <p>
              🔒 <strong>Kesimpulan:</strong> Model AI upstream (OpenAI/Anthropic) <strong>tidak pernah melihat satupun nama asli, email asli, ataupun alamat crypto asli</strong>, namun jawaban AI tetap 100% presisi dan tidak ada data yang tertukar!
            </p>
          </div>
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
