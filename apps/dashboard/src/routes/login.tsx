import React, { useState } from 'react';
import { loginWithKey } from '../lib/api.js';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

export function LoginPage({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [adminKey, setAdminKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      setError('Please enter your Admin Access Key.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await loginWithKey(adminKey.trim(), remember);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your admin key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/25 mb-4 border border-slate-700/60 bg-slate-900">
            <img src="/dashboard/logo.jpg" alt="AI Privacy Proxy Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">AI Privacy Proxy</h1>
          <p className="text-xs text-slate-400 mt-1">Self-Hosted Gateway & Admin Console</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0e1626]/90 border border-slate-800/90 rounded-2xl p-7 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-100">Portal Authentication</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your Administrator Access Key to access proxy settings, active sessions, and metrics.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-950/40 border border-red-800/50 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Admin Access Key</span>
                <span className="text-[10px] text-slate-500 font-mono">X-Admin-Key</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={adminKey}
                  onChange={(e) => setAdminKeyInput(e.target.value)}
                  placeholder="Enter ADMIN_API_KEY from .env"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono transition"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Help Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 text-center">
            Configured in <code className="text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded">ADMIN_API_KEY</code> on your <code className="text-slate-400 font-mono">.env</code> file.
          </div>
        </div>
      </div>
    </div>
  );
}
