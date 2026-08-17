import React, { useState, useEffect, useCallback } from 'react';
import { OverviewPage } from './routes/index.js';
import { MonitoringPage } from './routes/monitoring.js';
import { ProvidersPage } from './routes/providers.js';
import { PolicyPage } from './routes/policy.js';
import { RecognizersPage } from './routes/recognizers.js';
import { SessionsPage } from './routes/sessions.js';
import { AuditPage } from './routes/audit.js';
import { SettingsPage } from './routes/settings.js';
import { LoginPage } from './routes/login.js';
import { GuideModal } from './components/GuideModal.js';
import { isAuthenticated, clearAdminKey } from './lib/api.js';
import {
  LayoutDashboard,
  Activity,
  Globe,
  Shield,
  Sparkles,
  KeyRound,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  BookOpen,
} from 'lucide-react';

const VALID_PAGES = ['overview', 'monitoring', 'providers', 'policy', 'recognizers', 'sessions', 'audit', 'settings'];

function getPageFromUrl(): string {
  const path = window.location.pathname.replace(/\/+$/, '');
  const segments = path.split('/');
  const lastSegment = segments[segments.length - 1] || '';

  if (VALID_PAGES.includes(lastSegment)) {
    return lastSegment;
  }

  // Check hash fallback (e.g. #/providers or #providers)
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (VALID_PAGES.includes(hash)) {
    return hash;
  }

  return 'overview';
}

export function DashboardApp() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => isAuthenticated());
  const [currentPage, setCurrentPage] = useState<string>(() => getPageFromUrl());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const navigateTo = useCallback((pageId: string) => {
    if (!VALID_PAGES.includes(pageId)) return;
    setCurrentPage(pageId);
    setMobileSidebarOpen(false);

    // Update browser URL without reloading
    const newPath = `/dashboard/${pageId === 'overview' ? '' : pageId}`;
    window.history.pushState({ page: pageId }, '', newPath);
  }, []);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getPageFromUrl());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const handleAuthChange = () => {
      setIsLoggedIn(isAuthenticated());
    };

    window.addEventListener('auth_state_changed', handleAuthChange);
    return () => window.removeEventListener('auth_state_changed', handleAuthChange);
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of the Admin Console?')) {
      clearAdminKey();
      setIsLoggedIn(false);
    }
  };

  // If not authenticated, render Login view
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'providers', label: 'Providers', icon: Globe },
    { id: 'policy', label: 'Privacy Policies', icon: Shield },
    { id: 'recognizers', label: 'Custom Recognizers', icon: Sparkles },
    { id: 'sessions', label: 'Session Vault', icon: KeyRound },
    { id: 'audit', label: 'Audit Trail', icon: FileText },
    { id: 'settings', label: 'Gateway Settings', icon: Settings },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewPage onNavigate={(p) => navigateTo(p)} />;
      case 'monitoring':
        return <MonitoringPage />;
      case 'providers':
        return <ProvidersPage />;
      case 'policy':
        return <PolicyPage />;
      case 'recognizers':
        return <RecognizersPage />;
      case 'sessions':
        return <SessionsPage />;
      case 'audit':
        return <AuditPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage onNavigate={(p) => navigateTo(p)} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      {/* Mobile Sidebar Backdrop with smooth fade */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ease-out ${
          mobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar with smooth slide animation */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 w-64 bg-[#0c1220] border-r border-slate-800/80 z-50 flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header with Custom Logo */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 border border-slate-700/60 bg-slate-900 shrink-0">
              <img src="/dashboard/logo.jpg" alt="AI Privacy Proxy Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-slate-100">Privacy Proxy</div>
              <div className="text-[10px] font-mono text-blue-400">v0.1.0-alpha</div>
            </div>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with User Info & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
          <div className="flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-slate-300">Admin</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-800/80 bg-[#0c1220]/70 backdrop-blur px-6 flex items-center justify-between shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-200"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <span>Gateway Admin</span>
            <span>/</span>
            <span className="text-slate-200 font-medium capitalize">{currentPage}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Guide Button on the LEFT of Safe Token Vault */}
            <button
              onClick={() => setShowGuideModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 text-blue-300 text-xs font-semibold rounded-lg border border-blue-500/30 transition shadow-sm"
              title="Buka panduan lengkap sistem Privacy Proxy"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Guide
            </button>

            {/* Safe Token Vault Badge */}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Safe Token Vault
            </span>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-red-500/10 hover:text-red-300 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 hover:border-red-500/20 transition"
              title="End session"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>
        </header>

        {/* Dynamic Page Body */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {renderPage()}
        </main>
      </div>

      {/* Interactive Multi-step Guide Modal */}
      <GuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </div>
  );
}
