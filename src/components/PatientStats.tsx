import React, { memo } from 'react';
import { Clock, ListChecks, Activity, AlertCircle, Microscope, FileText } from 'lucide-react';

interface StatsProps {
    counts: {
        encounters: number;
        observations: number;
        conditions: number;
        procedures: number;
        documents: number;
    };
    lengthOfStay: string;
    onStatClick?: (type: 'encounter' | 'observation' | 'condition' | 'procedure' | 'timeline' | 'document') => void;
}

const PatientStats = memo(({ counts, lengthOfStay, onStatClick }: StatsProps) => {
    const stats = [
        { label: 'Length of Stay', value: lengthOfStay, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', type: 'timeline' as const },
        { label: 'Encounters', value: counts.encounters, icon: ListChecks, color: 'text-indigo-400', bg: 'bg-indigo-500/10', type: 'encounter' as const },
        { label: 'Observations', value: counts.observations, icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10', type: 'observation' as const },
        { label: 'Procedures', value: counts.procedures, icon: Microscope, color: 'text-purple-400', bg: 'bg-purple-500/10', type: 'procedure' as const },
        { label: 'Conditions', value: counts.conditions, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', type: 'condition' as const },
        { label: 'Documents', value: counts.documents, icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10', type: 'document' as const },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 shrink-0 px-1">
            {stats.map((stat, i) => (
                <button
                    key={i}
                    onClick={() => onStatClick?.(stat.type)}
                    className={`flex items-center gap-3 p-2 rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm transition-all hover:bg-slate-700/40 hover:border-slate-600/50 active:scale-95 text-left group`}
                >
                    <div className={`p-1.5 rounded-lg ${stat.bg} shrink-0`}>
                        <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-tight truncate">{stat.label}</div>
                        <div className="text-sm font-bold text-white truncate">
                            {stat.value || 0}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
});

PatientStats.displayName = 'PatientStats';

export default PatientStats;
