'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-all border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
            {theme === 'light' ? (
                <Moon className="w-5 h-5 text-slate-700" />
            ) : (
                <Sun className="w-5 h-5 text-amber-400" />
            )}
        </button>
    );
}
