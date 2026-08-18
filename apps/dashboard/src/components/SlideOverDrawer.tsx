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
      {/* Scrim with Smooth Fade */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        {/* Material 3 Side Sheet Container */}
        <div
          className={`w-screen ${widthClass} bg-surface-container-low border-l border-outline-variant/60 shadow-m3-4 flex flex-col pointer-events-auto transform transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
            active ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Side Sheet Header */}
          <div className="p-6 border-b border-outline-variant/40 flex items-start justify-between bg-surface-container/80 backdrop-blur">
            <div>
              <h2 className="text-base font-bold text-on-surface tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-on-surface-variant hover:text-on-surface rounded-m3-full hover:bg-surface-container-high transition"
              title="Close panel (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Side Sheet Body (Scrollable) */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 text-sm text-on-surface">
            {children}
          </div>

          {/* Side Sheet Footer */}
          {footer && (
            <div className="p-4 border-t border-outline-variant/40 bg-surface-container/90 backdrop-blur flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
