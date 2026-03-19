'use client';

import { useState } from 'react';
import { ObservationSet, VitalMeasurement } from './types';
import { Plus, Trash2, Edit2, Check, X, FlaskConical } from 'lucide-react';

const VITAL_PRESETS = [
    { label: 'Heart Rate', display: 'Heart Rate', code: '8867-4', unit: 'bpm' },
    { label: 'Systolic BP', display: 'Systolic BP', code: '8480-6', unit: 'mmHg' },
    { label: 'Diastolic BP', display: 'Diastolic BP', code: '8462-4', unit: 'mmHg' },
    { label: 'SpO2', display: 'Oxygen Saturation', code: '59408-5', unit: '%' },
    { label: 'Temp (C)', display: 'Body Temperature', code: '8310-5', unit: '°C' },
    { label: 'Resp Rate', display: 'Respiratory Rate', code: '9279-1', unit: '/min' },
];

export default function ObservationSetManager({
    sets,
    onChange
}: {
    sets: ObservationSet[];
    onChange: (sets: ObservationSet[]) => void;
}) {
    const [editingSetId, setEditingSetId] = useState<string | null>(null);
    const [draftSet, setDraftSet] = useState<ObservationSet | null>(null);

    const handleCreateNew = () => {
        const newSet: ObservationSet = {
            id: `set-${Date.now()}`,
            name: 'New Condition',
            vitals: []
        };
        setDraftSet(newSet);
        setEditingSetId(newSet.id);
    };

    const handleEdit = (set: ObservationSet) => {
        setDraftSet(JSON.parse(JSON.stringify(set))); // deep copy
        setEditingSetId(set.id);
    };

    const handleDelete = (id: string) => {
        onChange(sets.filter(s => s.id !== id));
    };

    const handleSave = () => {
        if (!draftSet) return;
        const exists = sets.find(s => s.id === draftSet.id);
        if (exists) {
            onChange(sets.map(s => s.id === draftSet.id ? draftSet : s));
        } else {
            onChange([...sets, draftSet]);
        }
        setEditingSetId(null);
        setDraftSet(null);
    };

    const handleCancel = () => {
        setEditingSetId(null);
        setDraftSet(null);
    };

    const addVitalToDraft = (presetLabel: string) => {
        if (!draftSet) return;
        
        if (presetLabel === 'Custom') {
            setDraftSet({
                ...draftSet,
                vitals: [...draftSet.vitals, { display: 'Custom Vital', code: '', value: '', unit: '' }]
            });
            return;
        }

        const preset = VITAL_PRESETS.find(p => p.label === presetLabel);
        if (!preset) return;
        
        setDraftSet({
            ...draftSet,
            vitals: [...draftSet.vitals, { display: preset.display, code: preset.code, value: '', unit: preset.unit }]
        });
    };

    const updateDraftVital = (index: number, field: keyof VitalMeasurement, value: string) => {
        if (!draftSet) return;
        const newVitals = [...draftSet.vitals];
        newVitals[index] = { ...newVitals[index], [field]: value };
        setDraftSet({ ...draftSet, vitals: newVitals });
    };

    const removeDraftVital = (index: number) => {
        if (!draftSet) return;
        const newVitals = draftSet.vitals.filter((_, i) => i !== index);
        setDraftSet({ ...draftSet, vitals: newVitals });
    };

    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm text-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-indigo-500" />
                    Conditions & Sets
                </span>
                <button
                    onClick={handleCreateNew}
                    disabled={editingSetId !== null}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-md transition-colors disabled:opacity-50"
                >
                    <Plus className="w-3.5 h-3.5" /> New
                </button>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-60 overflow-y-auto">
                {sets.length === 0 && !editingSetId && (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                        No conditions defined. Create one.
                    </div>
                )}
                {sets.map(set => {
                    if (editingSetId === set.id) return null; // handled in draft view
                    return (
                        <div key={set.id} className="p-3 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <div>
                                <h4 className="font-medium text-slate-800 dark:text-slate-200">{set.name}</h4>
                                <p className="text-xs text-slate-500">{set.vitals.length} vitals</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    disabled={editingSetId !== null}
                                    onClick={() => handleEdit(set)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md disabled:opacity-50"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    disabled={editingSetId !== null}
                                    onClick={() => handleDelete(set.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-md disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Draft Editing View */}
                {editingSetId && draftSet && (
                    <div className="p-4 bg-indigo-50/50 dark:bg-slate-800 border-l-2 border-indigo-500">
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Condition Name</label>
                            <input
                                type="text"
                                value={draftSet.name}
                                onChange={e => setDraftSet({ ...draftSet, name: e.target.value })}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Vitals ({draftSet.vitals.length})</span>
                                <select 
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                                    onChange={e => {
                                        if (e.target.value) {
                                            addVitalToDraft(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                >
                                    <option value="">+ Add Vital</option>
                                    <option value="Custom">✨ Custom Vital</option>
                                    <optgroup label="Presets">
                                        {VITAL_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                            
                            {draftSet.vitals.length === 0 ? (
                                <div className="text-xs text-slate-500 italic mb-2">No vitals added yet.</div>
                            ) : (
                                <div className="space-y-3 mb-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                    {draftSet.vitals.map((v, i) => (
                                        <div key={i} className="flex flex-col gap-2 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm relative group hover:border-indigo-500/50 transition-colors">
                                            <button 
                                                onClick={() => removeDraftVital(i)} 
                                                className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-500/30 transition-all opacity-0 group-hover:opacity-100 shadow-sm z-10"
                                                title="Remove Vital"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Display Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Heart Rate"
                                                        value={v.display}
                                                        onChange={e => updateDraftVital(i, 'display', e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">LOINC / SNOMED Code</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. 8867-4"
                                                        value={v.code || ''}
                                                        onChange={e => updateDraftVital(i, 'code', e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Value</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Value"
                                                        value={v.value}
                                                        onChange={e => updateDraftVital(i, 'value', e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-indigo-700 dark:text-indigo-400"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Unit</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. bpm"
                                                        value={v.unit || ''}
                                                        onChange={e => updateDraftVital(i, 'unit', e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 border-dashed">
                            <button onClick={handleCancel} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                                <Check className="w-3.5 h-3.5" /> Save
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
