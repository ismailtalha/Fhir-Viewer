'use client';

import { useState } from 'react';
import { X, Activity, FileHeart, Stethoscope, Calendar, Loader2, Check, Plus, Trash2 } from 'lucide-react';

interface SimpleEncounter {
    id: string;
    type: string;
    reason: string;
    start?: string;
    period: string;
    status: string;
}

interface AddResourceModalProps {
    patientId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    encounters?: SimpleEncounter[];
}

type ResourceType = 'observation' | 'condition' | 'procedure' | 'encounter';

// Vital-sign presets: display name, LOINC code, default unit
const VITAL_PRESETS: { label: string; display: string; code: string; unit: string }[] = [
    { label: 'Heart Rate (HR)', display: 'Heart Rate', code: '8867-4', unit: 'bpm' },
    { label: 'Blood Pressure – Sys', display: 'Systolic BP', code: '8480-6', unit: 'mmHg' },
    { label: 'Blood Pressure – Dia', display: 'Diastolic BP', code: '8462-4', unit: 'mmHg' },
    { label: 'Temperature (Temp)', display: 'Body Temperature', code: '8310-5', unit: '°C' },
    { label: 'Oxygen Saturation (SpO2)', display: 'Oxygen Saturation', code: '59408-5', unit: '%' },
    { label: 'Respiratory Rate (RR)', display: 'Respiratory Rate', code: '9279-1', unit: '/min' },
    { label: 'Weight', display: 'Body Weight', code: '29463-7', unit: 'kg' },
    { label: 'Height', display: 'Body Height', code: '8302-2', unit: 'cm' },
    { label: 'BMI', display: 'BMI', code: '39156-5', unit: 'kg/m²' },
    { label: 'Custom…', display: '', code: '', unit: '' },
];

interface VitalRow {
    id: number;
    display: string;
    code: string;
    value: string;
    unit: string;
    preset: string; // label of preset selected
}

const makeRow = (id: number): VitalRow => ({
    id,
    display: '',
    code: '',
    value: '',
    unit: '',
    preset: 'Custom…',
});

interface FormState {
    // Common
    effectiveDateTime: string;
    encounterId: string;
    // Observation – multi-vital
    obsCategory: 'vital-signs' | 'laboratory' | 'other';
    vitalRows: VitalRow[];
    // Condition
    condDisplay: string;
    condCode: string;
    condStatus: 'active' | 'resolved' | 'inactive';
    condSeverity: 'mild' | 'moderate' | 'severe' | '';
    // Procedure
    procDisplay: string;
    procCode: string;
    procStatus: 'completed' | 'in-progress' | 'not-done';
    // Encounter
    encType: 'ambulatory' | 'emergency' | 'inpatient';
    encStatus: 'finished' | 'in-progress' | 'planned';
    encReason: string;
    encEndDateTime: string;
}

const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
};

let rowCounter = 1;
const getInitialVitalRows = (): VitalRow[] => [makeRow(rowCounter++)];

const buildInitialFormState = (encounters: SimpleEncounter[]): FormState => ({
    effectiveDateTime: getCurrentDateTime(),
    // Pre-select the most recent (first in array, assumed sorted desc) encounter
    encounterId: encounters.length > 0 ? encounters[0].id : '',
    obsCategory: 'vital-signs',
    vitalRows: getInitialVitalRows(),
    condDisplay: '',
    condCode: '',
    condStatus: 'active',
    condSeverity: '',
    procDisplay: '',
    procCode: '',
    procStatus: 'completed',
    encType: 'ambulatory',
    encStatus: 'finished',
    encReason: '',
    encEndDateTime: '',
});

export default function AddResourceModal({
    patientId,
    isOpen,
    onClose,
    onSuccess,
    encounters = [],
}: AddResourceModalProps) {
    const [activeTab, setActiveTab] = useState<ResourceType>('observation');
    const [form, setForm] = useState<FormState>(() => buildInitialFormState(encounters));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleChange = (field: keyof Omit<FormState, 'vitalRows'>, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    // ─── Vital row helpers ────────────────────────────────────────────────────
    const updateVitalRow = (id: number, changes: Partial<VitalRow>) => {
        setForm(prev => ({
            ...prev,
            vitalRows: prev.vitalRows.map(r => r.id === id ? { ...r, ...changes } : r),
        }));
        setError(null);
    };

    const applyPreset = (rowId: number, label: string) => {
        const preset = VITAL_PRESETS.find(p => p.label === label);
        if (!preset) return;
        updateVitalRow(rowId, {
            preset: label,
            display: preset.display,
            code: preset.code,
            unit: preset.unit,
        });
    };

    const addVitalRow = () => {
        setForm(prev => ({
            ...prev,
            vitalRows: [...prev.vitalRows, makeRow(rowCounter++)],
        }));
    };

    const removeVitalRow = (id: number) => {
        setForm(prev => ({
            ...prev,
            vitalRows: prev.vitalRows.filter(r => r.id !== id),
        }));
    };
    // ─────────────────────────────────────────────────────────────────────────

    const resetForm = () => {
        rowCounter = 1;
        setForm(buildInitialFormState(encounters));
        setError(null);
        setSuccess(false);
    };

    const handleTabChange = (tab: ResourceType) => {
        setActiveTab(tab);
        setError(null);
        setSuccess(false);
    };

    // ─── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            if (activeTab === 'observation') {
                // Validate all rows have display + value
                for (const row of form.vitalRows) {
                    if (!row.display || !row.value) {
                        throw new Error('Each vital row requires a display name and a value');
                    }
                }

                // Fire one POST per row (FHIR creates one Observation per vital)
                const requests = form.vitalRows.map(row =>
                    fetch(`/api/fhir/patients/${patientId}/resources/create`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            resourceType: 'Observation',
                            data: {
                                category: form.obsCategory,
                                display: row.display,
                                code: row.code || undefined,
                                value: row.value,
                                unit: row.unit || undefined,
                                effectiveDateTime: new Date(form.effectiveDateTime).toISOString(),
                                encounterId: form.encounterId || undefined,
                            },
                        }),
                    })
                );

                const responses = await Promise.all(requests);
                for (const res of responses) {
                    const result = await res.json();
                    if (!res.ok || result.error) throw new Error(result.error || 'Failed to create observation');
                }
            } else {
                let body: object;

                switch (activeTab) {
                    case 'condition':
                        if (!form.condDisplay) throw new Error('Condition name is required');
                        body = {
                            resourceType: 'Condition',
                            data: {
                                display: form.condDisplay,
                                code: form.condCode,
                                clinicalStatus: form.condStatus,
                                severity: form.condSeverity || undefined,
                                onsetDateTime: new Date(form.effectiveDateTime).toISOString(),
                                encounterId: form.encounterId || undefined,
                            },
                        };
                        break;

                    case 'procedure':
                        if (!form.procDisplay) throw new Error('Procedure name is required');
                        body = {
                            resourceType: 'Procedure',
                            data: {
                                display: form.procDisplay,
                                code: form.procCode,
                                status: form.procStatus,
                                performedDateTime: new Date(form.effectiveDateTime).toISOString(),
                                encounterId: form.encounterId || undefined,
                            },
                        };
                        break;

                    case 'encounter':
                        if (!form.encReason) throw new Error('Reason for visit is required');
                        body = {
                            resourceType: 'Encounter',
                            data: {
                                type: form.encType,
                                status: form.encStatus,
                                reason: form.encReason,
                                start: new Date(form.effectiveDateTime).toISOString(),
                                end: form.encEndDateTime ? new Date(form.encEndDateTime).toISOString() : undefined,
                            },
                        };
                        break;

                    default:
                        throw new Error('Invalid resource type');
                }

                const response = await fetch(`/api/fhir/patients/${patientId}/resources/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                const result = await response.json();
                if (!response.ok || result.error) throw new Error(result.error || 'Failed to create resource');
            }

            setSuccess(true);
            setTimeout(() => {
                resetForm();
                onSuccess();
                onClose();
            }, 1000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };
    // ─────────────────────────────────────────────────────────────────────────

    const tabs = [
        { id: 'observation' as const, label: 'Observation', icon: Activity },
        { id: 'condition' as const, label: 'Condition', icon: FileHeart },
        { id: 'procedure' as const, label: 'Procedure', icon: Stethoscope },
        { id: 'encounter' as const, label: 'Encounter', icon: Calendar },
    ];

    const inputCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm';
    const labelCls = 'block text-xs font-medium text-slate-400 mb-1';

    /** Renders an encounter label for the dropdown option */
    const encounterLabel = (enc: SimpleEncounter) => {
        const date = enc.start ? new Date(enc.start).toLocaleDateString() : enc.period.split(' - ')[0];
        return `${enc.type} – ${enc.reason} (${date})`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Add New Resource</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Form Content */}
                <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">

                    {/* ── Encounter Link (shown for Observation, Condition, Procedure) ── */}
                    {activeTab !== 'encounter' && encounters.length > 0 && (
                        <div className="p-3 bg-slate-800/70 border border-slate-700 rounded-xl">
                            <label className={labelCls}>
                                <Calendar className="inline w-3.5 h-3.5 mr-1 text-indigo-400" />
                                Link to Encounter
                            </label>
                            <select
                                value={form.encounterId}
                                onChange={e => handleChange('encounterId', e.target.value)}
                                className={inputCls}
                            >
                                <option value="">— None —</option>
                                {encounters.map(enc => (
                                    <option key={enc.id} value={enc.id}>
                                        {encounterLabel(enc)}
                                    </option>
                                ))}
                            </select>
                            {form.encounterId && (
                                <p className="text-[11px] text-indigo-400 mt-1">
                                    ✓ This resource will be linked to the selected encounter
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── Date/Time ── */}
                    <div>
                        <label className={labelCls}>
                            {activeTab === 'encounter' ? 'Start Date/Time' : 'Date/Time'}
                        </label>
                        <input
                            type="datetime-local"
                            value={form.effectiveDateTime}
                            onChange={e => handleChange('effectiveDateTime', e.target.value)}
                            className={inputCls}
                        />
                    </div>

                    {/* ══════════ OBSERVATION FORM ══════════ */}
                    {activeTab === 'observation' && (
                        <>
                            {/* Category */}
                            <div>
                                <label className={labelCls}>Category *</label>
                                <select
                                    value={form.obsCategory}
                                    onChange={e => handleChange('obsCategory', e.target.value)}
                                    className={inputCls}
                                >
                                    <option value="vital-signs">Vital Signs</option>
                                    <option value="laboratory">Laboratory</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            {/* ── Vital Rows ── */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                                        Measurements
                                    </span>
                                    <button
                                        type="button"
                                        onClick={addVitalRow}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Vital
                                    </button>
                                </div>

                                {form.vitalRows.map((row, idx) => (
                                    <div
                                        key={row.id}
                                        className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2"
                                    >
                                        {/* Row header */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                                                Vital #{idx + 1}
                                            </span>
                                            {form.vitalRows.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeVitalRow(row.id)}
                                                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Preset picker */}
                                        <div>
                                            <label className={labelCls}>Quick Select</label>
                                            <select
                                                value={row.preset}
                                                onChange={e => applyPreset(row.id, e.target.value)}
                                                className={inputCls}
                                            >
                                                {VITAL_PRESETS.map(p => (
                                                    <option key={p.label} value={p.label}>{p.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Display name + LOINC code */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className={labelCls}>Display Name *</label>
                                                <input
                                                    type="text"
                                                    value={row.display}
                                                    onChange={e => updateVitalRow(row.id, { display: e.target.value })}
                                                    placeholder="e.g., Heart Rate"
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelCls}>LOINC Code</label>
                                                <input
                                                    type="text"
                                                    value={row.code}
                                                    onChange={e => updateVitalRow(row.id, { code: e.target.value })}
                                                    placeholder="e.g., 8867-4"
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>

                                        {/* Value + Unit */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className={labelCls}>Value *</label>
                                                <input
                                                    type="text"
                                                    value={row.value}
                                                    onChange={e => updateVitalRow(row.id, { value: e.target.value })}
                                                    placeholder="e.g., 72"
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Unit</label>
                                                <input
                                                    type="text"
                                                    value={row.unit}
                                                    onChange={e => updateVitalRow(row.id, { unit: e.target.value })}
                                                    placeholder="e.g., bpm"
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Summary badge */}
                                {form.vitalRows.filter(r => r.display && r.value).length > 1 && (
                                    <p className="text-[11px] text-green-400">
                                        ✓ {form.vitalRows.filter(r => r.display && r.value).length} observations will be created simultaneously
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {/* ══════════ CONDITION FORM ══════════ */}
                    {activeTab === 'condition' && (
                        <>
                            <div>
                                <label className={labelCls}>Condition Name *</label>
                                <input
                                    type="text"
                                    value={form.condDisplay}
                                    onChange={e => handleChange('condDisplay', e.target.value)}
                                    placeholder="e.g., Type 2 Diabetes, Hypertension"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>SNOMED/ICD Code (optional)</label>
                                <input
                                    type="text"
                                    value={form.condCode}
                                    onChange={e => handleChange('condCode', e.target.value)}
                                    placeholder="e.g., 44054006"
                                    className={inputCls}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Clinical Status *</label>
                                    <select
                                        value={form.condStatus}
                                        onChange={e => handleChange('condStatus', e.target.value)}
                                        className={inputCls}
                                    >
                                        <option value="active">Active</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Severity</label>
                                    <select
                                        value={form.condSeverity}
                                        onChange={e => handleChange('condSeverity', e.target.value)}
                                        className={inputCls}
                                    >
                                        <option value="">Not specified</option>
                                        <option value="mild">Mild</option>
                                        <option value="moderate">Moderate</option>
                                        <option value="severe">Severe</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ══════════ PROCEDURE FORM ══════════ */}
                    {activeTab === 'procedure' && (
                        <>
                            <div>
                                <label className={labelCls}>Procedure Name *</label>
                                <input
                                    type="text"
                                    value={form.procDisplay}
                                    onChange={e => handleChange('procDisplay', e.target.value)}
                                    placeholder="e.g., Appendectomy, X-Ray"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>CPT/SNOMED Code (optional)</label>
                                <input
                                    type="text"
                                    value={form.procCode}
                                    onChange={e => handleChange('procCode', e.target.value)}
                                    placeholder="e.g., 44950"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Status *</label>
                                <select
                                    value={form.procStatus}
                                    onChange={e => handleChange('procStatus', e.target.value)}
                                    className={inputCls}
                                >
                                    <option value="completed">Completed</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="not-done">Not Done</option>
                                </select>
                            </div>
                        </>
                    )}

                    {/* ══════════ ENCOUNTER FORM ══════════ */}
                    {activeTab === 'encounter' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Type *</label>
                                    <select
                                        value={form.encType}
                                        onChange={e => handleChange('encType', e.target.value)}
                                        className={inputCls}
                                    >
                                        <option value="ambulatory">Ambulatory</option>
                                        <option value="emergency">Emergency</option>
                                        <option value="inpatient">Inpatient</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Status *</label>
                                    <select
                                        value={form.encStatus}
                                        onChange={e => handleChange('encStatus', e.target.value)}
                                        className={inputCls}
                                    >
                                        <option value="finished">Finished</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="planned">Planned</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Reason for Visit *</label>
                                <input
                                    type="text"
                                    value={form.encReason}
                                    onChange={e => handleChange('encReason', e.target.value)}
                                    placeholder="e.g., Annual checkup, Follow-up"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>End Date/Time (optional)</label>
                                <input
                                    type="datetime-local"
                                    value={form.encEndDateTime}
                                    onChange={e => handleChange('encEndDateTime', e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        </>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Resource created successfully!
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700 bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || success}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creating...
                            </>
                        ) : success ? (
                            <>
                                <Check className="w-4 h-4" />
                                Created!
                            </>
                        ) : activeTab === 'observation' && form.vitalRows.length > 1 ? (
                            `Create ${form.vitalRows.length} Observations`
                        ) : (
                            'Create Resource'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
