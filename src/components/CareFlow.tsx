import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Activity, ClipboardList, Microchip, UserCheck, Stethoscope } from 'lucide-react';

interface CareFlowProps {
    inputs: {
        vitals: number;
        labs: number;
        observations: number;
    };
    outputs: {
        procedures: number;
        encounters: number;
        conditions: number;
    };
}

export default function CareFlow({ inputs, outputs }: CareFlowProps) {
    const totalInputs = inputs.vitals + inputs.labs + inputs.observations;
    const totalOutputs = outputs.procedures + outputs.encounters + outputs.conditions;
    const max = Math.max(totalInputs, totalOutputs) || 1;

    const inputItems = [
        { label: 'Vital Signs', count: inputs.vitals, icon: Activity, color: 'text-cyan-400' },
        { label: 'Lab Results', count: inputs.labs, icon: ClipboardList, color: 'text-blue-400' },
        { label: 'General Obs', count: inputs.observations, icon: Microchip, color: 'text-teal-400' },
    ];

    const outputItems = [
        { label: 'Procedures', count: outputs.procedures, icon: Stethoscope, color: 'text-purple-400' },
        { label: 'Encounters', count: outputs.encounters, icon: UserCheck, color: 'text-indigo-400' },
        { label: 'Diagnoses', count: outputs.conditions, icon: ClipboardList, color: 'text-red-400' },
    ];

    return (
        <div className="bg-slate-800/30 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4 flex flex-col h-[280px]">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        Clinical Intake vs. Response
                    </h3>
                    <p className="text-[10px] text-slate-400">Visualization of data flow (Inputs) to clinical outcomes (Outputs)</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
                        <span className="text-xs text-slate-400 font-mono">INPUTS</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                        <span className="text-xs text-slate-400 font-mono">OUTPUTS</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center gap-12 relative">
                {/* Connection Arcs (Visual Only) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-dashed border-slate-700 rounded-full opacity-20 animate-pulse"></div>

                {/* Left Side: Inputs */}
                <div className="flex-1 flex flex-col gap-2 text-right pr-4 border-r border-slate-700/50">
                    {inputItems.map((item, i) => (
                        <div key={i} className="group cursor-default">
                            <div className="flex items-center justify-end gap-2 mb-0.5">
                                <span className="text-[11px] font-medium text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                            </div>
                            <div className="w-full bg-slate-900/50 rounded-full h-1.5 overflow-hidden flex justify-end">
                                <div
                                    className="bg-gradient-to-l from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                                    style={{ width: `${(item.count / max) * 100}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 mt-0.5">{item.count}</span>
                        </div>
                    ))}
                    <div className="mt-2 text-right">
                        <div className="text-xl font-black text-white">{totalInputs}</div>
                        <div className="text-[9px] text-slate-500 uppercase flex items-center justify-end gap-1">
                            Total Intake <ArrowDownLeft className="w-2.5 h-2.5 text-cyan-500" />
                        </div>
                    </div>
                </div>

                {/* Right Side: Outputs */}
                <div className="flex-1 flex flex-col gap-2 pl-4">
                    {outputItems.map((item, i) => (
                        <div key={i} className="group cursor-default">
                            <div className="flex items-center gap-2 mb-0.5">
                                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                                <span className="text-[11px] font-medium text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                            </div>
                            <div className="w-full bg-slate-900/50 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                                    style={{ width: `${(item.count / max) * 100}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 mt-0.5">{item.count}</span>
                        </div>
                    ))}
                    <div className="mt-2">
                        <div className="text-xl font-black text-white">{totalOutputs}</div>
                        <div className="text-[9px] text-slate-500 uppercase flex items-center gap-1">
                            Clinical Outcomes <ArrowUpRight className="w-2.5 h-2.5 text-purple-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
