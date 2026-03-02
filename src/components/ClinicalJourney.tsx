import React, { useState, useMemo, memo } from 'react';
import { TimelineEvent } from '../types/fhir';
import {
    ArrowRight,
    Activity,
    Stethoscope,
    ClipboardList,
    AlertCircle,
    Clock,
    ExternalLink,
    X,
    ChevronRight
} from 'lucide-react';

interface ClinicalJourneyProps {
    events: TimelineEvent[];
}

export const ClinicalJourney = memo(({ events }: ClinicalJourneyProps) => {
    const [selectedResource, setSelectedResource] = useState<any | null>(null);

    // Sort events chronologically (oldest first) for the journey flow
    const chronologicalEvents = useMemo(() =>
        [...events].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ), [events]
    );

    // Helper to get time difference between two timestamps
    const getTimeDiff = (t1: string, t2: string) => {
        const d1 = new Date(t1);
        const d2 = new Date(t2);
        const diffMs = d2.getTime() - d1.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
        if (diffHours > 0) return `${diffHours}h`;
        return 'Shortly after';
    };

    const isInput = (type: string) => type === 'observation' || type === 'condition';
    const isOutput = (type: string) => type === 'procedure' || type === 'encounter';

    return (
        <div className="bg-slate-800/30 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6 flex flex-col h-[380px] relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Clinical Pathway Journey
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 italic">Sequential visualization of medical inputs and provider responses</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
                        <span className="text-xs text-slate-400 font-mono">INTAKE</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                        <span className="text-xs text-slate-400 font-mono">RESPONSE</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar flex items-center min-h-[180px]">
                <div className="flex items-center gap-4 px-4 min-w-max">
                    {chronologicalEvents.map((event, index) => {
                        const timeAfterPrevious = index > 0
                            ? getTimeDiff(chronologicalEvents[index - 1].timestamp, event.timestamp)
                            : null;

                        return (
                            <React.Fragment key={event.id}>
                                {timeAfterPrevious && (
                                    <div className="flex flex-col items-center gap-1 group">
                                        <div className="h-[2px] w-12 bg-slate-700 group-hover:bg-blue-500/50 transition-colors"></div>
                                        <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap bg-slate-900/50 px-1 rounded">
                                            +{timeAfterPrevious}
                                        </span>
                                    </div>
                                )}

                                <div
                                    className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer hover:scale-105 active:scale-95 group min-w-[180px] max-w-[240px]
                    ${isInput(event.type)
                                            ? 'bg-cyan-500/5 border-cyan-500/20 hover:bg-cyan-500/10 hover:border-cyan-500/40'
                                            : 'bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10 hover:border-purple-500/40'}`}
                                    onClick={() => setSelectedResource(event.raw)}
                                >
                                    {/* Icon Badge */}
                                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 p-2 rounded-xl shadow-lg 
                    ${isInput(event.type) ? 'bg-cyan-600 text-white' : 'bg-purple-600 text-white'}`}>
                                        {event.type === 'condition' && <AlertCircle className="w-4 h-4" />}
                                        {event.type === 'observation' && <Activity className="w-4 h-4" />}
                                        {event.type === 'encounter' && <Stethoscope className="w-4 h-4" />}
                                        {event.type === 'procedure' && <ClipboardList className="w-4 h-4" />}
                                    </div>

                                    <div className="mt-2 text-center">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                            {event.type}
                                        </div>
                                        <div className="text-sm font-bold text-white line-clamp-2 leading-snug">
                                            {event.title}
                                        </div>
                                        {event.value && (
                                            <div className="mt-2 text-lg font-black text-cyan-400 font-mono">
                                                {event.value} <span className="text-xs font-normal opacity-70">{event.unit}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono bg-black/20 px-2 py-1 rounded-lg">
                                        <Clock className="w-3 h-3" />
                                        {new Date(event.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}
                                    </div>

                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink className="w-3 h-3 text-slate-400" />
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Resource Detail Modal */}
            {selectedResource && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-slate-800/30">
                            <div>
                                <h4 className="text-xl font-bold text-white">Resource Metadata</h4>
                                <p className="text-sm text-slate-400">Raw clinical data representation</p>
                            </div>
                            <button
                                onClick={() => setSelectedResource(null)}
                                className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 bg-slate-950/50 custom-scrollbar">
                            <pre className="text-xs font-mono text-cyan-300 leading-relaxed overflow-x-auto">
                                {JSON.stringify(selectedResource, null, 2)}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 flex justify-end">
                            <button
                                onClick={() => setSelectedResource(null)}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

ClinicalJourney.displayName = 'ClinicalJourney';

export default ClinicalJourney;
