'use client';

import { useState, useEffect } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';

interface FullscreenCardProps {
    /** Icon element shown in the card header */
    icon: React.ReactNode;
    /** Card title */
    title: string;
    /** Optional subtitle shown only in fullscreen mode */
    subtitle?: string;
    /** Content shown inside the card */
    children: React.ReactNode;
    /** Extra controls placed next to the fullscreen toggle (e.g. Load More) */
    footer?: React.ReactNode;
    /** Extra CSS classes for the normal-state wrapper */
    className?: string;
}

export default function FullscreenCard({
    icon,
    title,
    subtitle,
    children,
    footer,
    className = '',
}: FullscreenCardProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Close on Escape
    useEffect(() => {
        if (!isFullscreen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsFullscreen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isFullscreen]);

    // Prevent body scroll while open
    useEffect(() => {
        document.body.style.overflow = isFullscreen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isFullscreen]);

    const ToggleBtn = () => (
        <button
            onClick={() => setIsFullscreen(v => !v)}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Expand to fullscreen'}
            className={`
                p-1.5 rounded-lg transition-all duration-200
                ${isFullscreen
                    ? 'text-indigo-400 bg-indigo-500/20 hover:bg-indigo-500/30'
                    : 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10'
                }
            `}
        >
            {isFullscreen
                ? <Minimize2 className="w-4 h-4" />
                : <Maximize2 className="w-4 h-4" />
            }
        </button>
    );

    /* ── Normal (card) mode ─────────────────────────────────────────────── */
    const normalCard = (
        <div className={`bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 h-[440px] flex flex-col transition-all duration-500 shadow-sm ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                    {icon}
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
                </div>
                <ToggleBtn />
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {children}
            </div>

            {/* Footer (e.g. Load More) */}
            {footer && <div className="shrink-0 mt-3">{footer}</div>}
        </div>
    );

    /* ── Fullscreen overlay mode ────────────────────────────────────────── */
    const fullscreenOverlay = (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200">
            {/* Overlay header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-700/60 shrink-0 bg-slate-900/80">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                        {subtitle && (
                            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ToggleBtn />
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors ml-1"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Fullscreen content */}
            <div className="flex-1 overflow-hidden flex flex-col px-8 py-6 min-h-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {children}
                </div>
                {footer && (
                    <div className="shrink-0 mt-4 border-t border-slate-700/50 pt-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {normalCard}
            {isFullscreen && fullscreenOverlay}
        </>
    );
}
