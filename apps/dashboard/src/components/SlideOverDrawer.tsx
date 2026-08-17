import React, { useEffect, useState } from 'react';
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
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame1: number | undefined;
    let frame2: number | undefined;

    if (isOpen) {
      setMounted(true);
      // Double rAF ensures DOM is rendered with initial translate-x-full before transitioning to translate-x-0
      frame1 = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(() => {
          setActive(true);
        });
      });
    } else {
      setActive(false);
      timer = setTimeout(() => {
        setMounted(false);
      }, 300);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (frame1) cancelAnimationFrame(frame1);
      if (frame2) cancelAnimationFrame(frame2);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Smooth Backdrop with Fade in/out */}
      <div
        className={`fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <div
          className={`w-screen ${widthClass} bg-[#0c1220] border-l border-slate-800/90 shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            active ? 'translate-x-0 shadow-2xl shadow-black/80' : 'translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-800/90 flex items-start justify-between bg-slate-950/70 backdrop-blur">
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight">{title}</h2>
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
            <div className="p-4 border-t border-slate-800/90 bg-slate-950/80 backdrop-blur flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
