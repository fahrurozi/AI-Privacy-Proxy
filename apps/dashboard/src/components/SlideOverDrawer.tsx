import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
}

export function SlideOverDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  widthClass = 'max-w-lg',
}: SlideOverDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className={`w-screen ${widthClass} bg-[#0e1626] border-l border-slate-800 shadow-2xl flex flex-col transform transition ease-in-out duration-300`}>
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
            <div>
              <h2 className="text-base font-bold text-slate-100">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              title="Close panel (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body (Scrollable) */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 text-sm text-slate-300">
            {children}
          </div>

          {/* Drawer Footer */}
          {footer && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
