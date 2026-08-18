import React, { useState } from 'react';
import { loginWithKey } from '../lib/api.js';
import { useTheme } from '../lib/theme.js';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, Sun, Moon } from 'lucide-react';

export function LoginPage({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [adminKey, setAdminKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

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
    <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none transition-colors duration-200">
      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-m3-full bg-surface-container border border-outline-variant/60 text-on-surface hover:bg-surface-container-high transition shadow-m3-1"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-m3-xl overflow-hidden shadow-m3-2 mb-4 border border-outline-variant/60 bg-surface">
            <img src="/dashboard/logo.jpg" alt="AI Privacy Proxy Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">AI Privacy Proxy</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">Self-Hosted Gateway & Admin Console</p>
        </div>

        {/* Material 3 Login Card Container */}
        <div className="bg-surface-container-low border border-outline-variant/60 rounded-m3-2xl p-7 sm:p-8 shadow-m3-3 backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-base font-bold text-on-surface">Portal Authentication</h2>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              Enter your Administrator Access Key to access proxy settings, active sessions, and telemetry metrics.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-error-container border border-error/30 rounded-m3-lg flex items-start gap-2.5 text-xs text-error-on-container font-medium">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center justify-between">
                <span>Admin Access Key</span>
                <span className="text-[10px] text-on-surface-variant font-mono">X-Admin-Key</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={adminKey}
                  onChange={(e) => setAdminKeyInput(e.target.value)}
                  placeholder="Enter ADMIN_API_KEY from .env"
                  className="w-full bg-surface-container border border-outline-variant/60 rounded-m3-md pl-10 pr-10 py-3 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary font-mono transition"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-on-surface-variant hover:text-on-surface transition"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-on-surface-variant hover:text-on-surface select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded-m3-xs bg-surface-container border-outline-variant text-primary focus:ring-0 cursor-pointer"
                />
                <span>Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-primary text-primary-on text-xs font-semibold rounded-m3-full shadow-m3-1 hover:shadow-m3-2 transition duration-150 disabled:opacity-50 m3-state-layer"
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
          <div className="mt-6 pt-4 border-t border-outline-variant/40 text-[11px] text-on-surface-variant text-center">
            Configured in <code className="text-primary font-mono bg-surface-container px-2 py-0.5 rounded-m3-xs">ADMIN_API_KEY</code> on your <code className="text-on-surface font-mono">.env</code> file.
          </div>
        </div>
      </div>
    </div>
  );
}
