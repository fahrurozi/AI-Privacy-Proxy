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
import { useTheme } from './lib/theme.js';
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
  Sun,
  Moon,
} from 'lucide-react';

const VALID_PAGES = ['overview', 'monitoring', 'providers', 'policy', 'recognizers', 'sessions', 'audit', 'settings'];

function getPageFromUrl(): string {
  const path = window.location.pathname.replace(/\/+$/, '');
  const segments = path.split('/');
  const lastSegment = segments[segments.length - 1] || '';

  if (VALID_PAGES.includes(lastSegment)) {
    return lastSegment;
  }

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
  const { theme, toggleTheme } = useTheme();

  const navigateTo = useCallback((pageId: string) => {
    if (!VALID_PAGES.includes(pageId)) return;
    setCurrentPage(pageId);
    setMobileSidebarOpen(false);

    const newPath = `/dashboard/${pageId === 'overview' ? '' : pageId}`;
    window.history.pushState({ page: pageId }, '', newPath);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getPageFromUrl());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    <div className="flex h-screen bg-background text-on-surface overflow-hidden font-sans select-none transition-colors duration-200">
      {/* Mobile Scrim Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ease-out ${
          mobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Material 3 Modal / Standard Navigation Drawer */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 w-72 bg-surface-container-low border-r border-outline-variant/60 z-50 flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
          mobileSidebarOpen ? 'translate-x-0 shadow-m3-4' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-m3-md overflow-hidden shadow-m3-1 border border-outline-variant bg-surface shrink-0">
              <img src="/dashboard/logo.jpg" alt="AI Privacy Proxy Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-on-surface">Privacy Proxy</div>
              <div className="text-[11px] font-mono text-primary font-medium">v0.1.0</div>
            </div>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-2 text-on-surface-variant hover:text-on-surface rounded-m3-full hover:bg-surface-container-high transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items (M3 Active Indicator Pill Style) */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-m3-full text-xs font-semibold transition-all duration-200 m3-state-layer ${
                  active
                    ? 'bg-primary-container text-primary-on-container shadow-m3-1'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${active ? 'text-primary-on-container scale-110' : 'text-on-surface-variant'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with User Info & Logout */}
        <div className="p-4 border-t border-outline-variant/40 bg-surface-container space-y-3">
          <div className="flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-m3-full bg-secondary-container text-secondary-on-container flex items-center justify-center font-semibold">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-on-surface">Admin</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-secondary font-medium">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span>Online</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-error hover:bg-error-container hover:text-error-on-container rounded-m3-full transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Material 3 Top App Bar */}
        <header className="h-16 border-b border-outline-variant/40 bg-surface/85 backdrop-blur-md px-6 flex items-center justify-between shrink-0 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-on-surface-variant hover:text-on-surface rounded-m3-full hover:bg-surface-container-high transition"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="font-medium">Gateway Admin</span>
              <span>/</span>
              <span className="text-on-surface font-bold capitalize bg-surface-container-high px-2.5 py-1 rounded-m3-sm text-[11px]">
                {currentPage}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Theme Switcher Icon Button in Top Bar */}
            <button
              onClick={toggleTheme}
              className="p-2 text-on-surface-variant hover:text-on-surface rounded-m3-full hover:bg-surface-container-high transition"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Guide Button with M3 Elevation */}
            <button
              onClick={() => setShowGuideModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-container text-primary-on-container text-xs font-semibold rounded-m3-full shadow-m3-1 hover:shadow-m3-2 transition-all"
              title="Open system architecture guide"
            >
              <BookOpen className="w-3.5 h-3.5" /> Guide
            </button>

            {/* Safe Token Vault Badge */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-m3-full text-xs font-semibold bg-secondary-container text-secondary-on-container">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              Safe Token Vault
            </span>
          </div>
        </header>

        {/* Dynamic Page Body with M3 background */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
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
