'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Server, Moon, Sun } from 'lucide-react';
import PatientList from '@/components/PatientList';
import PatientDashboard from '@/components/PatientDashboard';
import ThemeToggle from '@/components/ThemeToggle';
import { SimplePatient } from '@/types/fhir';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, User } from 'lucide-react';

export default function ViewerPage() {
    const router = useRouter();
    const [selectedPatient, setSelectedPatient] = useState<SimplePatient | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const handleDisconnect = async () => {
        try {
            await fetch('/api/disconnect', { method: 'POST' });
        } catch {
            // Ignore errors
        }
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-mesh selection:bg-indigo-500/30 transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50">
                <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <Server className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">FHIR AI Agent</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Clinical Data Ecosystem</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={handleDisconnect}
                            className="flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-sm font-medium border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        >
                            <LogOut className="w-4 h-4" />
                            Disconnect
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1920px] mx-auto p-4 flex gap-4 h-[calc(100vh-64px)] overflow-hidden">
                {/* Patient List Sidebar */}
                <aside
                    className={`flex-shrink-0 transition-all duration-300 ease-in-out relative flex flex-col gap-3 ${sidebarCollapsed ? 'w-20' : 'w-80'
                        }`}
                >
                    {/* Sidebar Toggle Button */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className={`absolute -right-3 top-10 z-10 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl group`}
                    >
                        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>

                    {/* Selected Patient Mini-Profile (When Collapsed) */}
                    {sidebarCollapsed && selectedPatient && (
                        <div className="flex flex-col items-center gap-2 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl animate-in fade-in zoom-in duration-300">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-500 ring-4 ring-green-500/20 shadow-glow" />
                        </div>
                    )}

                    <div className={`flex-1 min-h-0 overflow-hidden transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <PatientList
                            selectedPatientId={selectedPatient?.id || null}
                            onSelectPatient={setSelectedPatient}
                        />
                    </div>

                    {/* Collapsed Search Icon */}
                    {sidebarCollapsed && !selectedPatient && (
                        <button
                            onClick={() => setSidebarCollapsed(false)}
                            className="w-full flex flex-col items-center gap-2 p-3 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-2xl transition-all"
                        >
                            <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                                <Server className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Search</span>
                        </button>
                    )}
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 bg-slate-900/30 rounded-2xl border border-slate-700/30 overflow-hidden relative">
                    {selectedPatient ? (
                        <PatientDashboard patient={selectedPatient} />
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-3xl bg-slate-800/50 flex items-center justify-center mx-auto mb-6 border border-slate-700/50 shadow-2xl relative">
                                    <Server className="w-10 h-10 text-indigo-400" />
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full animate-pulse" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-3">Welcome to Clinical Hub</h2>
                                <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                                    Select a patient from the sidebar to begin clinical review and documentation.
                                    Use the AI agent for rapid data entry.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
