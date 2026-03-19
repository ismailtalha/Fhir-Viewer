'use client';

import { useState } from 'react';
import { X, UserPlus, Loader2, Check } from 'lucide-react';
import { SimplePatient } from '@/types/fhir';

interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (patient: SimplePatient) => void;
}

interface FormState {
    givenName: string;
    familyName: string;
    gender: 'male' | 'female' | 'other' | 'unknown';
    birthDate: string;
    phone: string;
    email: string;
    mrn: string;
    addressLine: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    encounterType: 'ambulatory' | 'emergency' | 'inpatient';
    encounterReason: string;
}

const initialFormState: FormState = {
    givenName: '',
    familyName: '',
    gender: 'unknown',
    birthDate: '',
    phone: '',
    email: '',
    mrn: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    encounterType: 'ambulatory',
    encounterReason: 'Initial Visit',
};

export default function AddPatientModal({ isOpen, onClose, onSuccess }: AddPatientModalProps) {
    const [form, setForm] = useState<FormState>(initialFormState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleChange = (field: keyof FormState, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const resetForm = () => {
        setForm(initialFormState);
        setError(null);
        setSuccess(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!form.givenName || !form.familyName || !form.birthDate) {
            setError('Given Name, Family Name, and Birth Date are required.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const body = {
                givenName: form.givenName,
                familyName: form.familyName,
                gender: form.gender,
                birthDate: form.birthDate,
                phone: form.phone || undefined,
                email: form.email || undefined,
                mrn: form.mrn || undefined,
                address: (form.addressLine || form.city || form.state || form.postalCode || form.country) ? {
                    line: form.addressLine ? [form.addressLine] : undefined,
                    city: form.city || undefined,
                    state: form.state || undefined,
                    postalCode: form.postalCode || undefined,
                    country: form.country || undefined,
                } : undefined,
                encounterType: form.encounterType,
                encounterReason: form.encounterReason || undefined,
            };

            const response = await fetch('/api/fhir/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const result = await response.json();
            
            if (!response.ok || result.error) {
                throw new Error(result.error || 'Failed to create patient');
            }

            setSuccess(true);
            setTimeout(() => {
                resetForm();
                onSuccess(result.patient);
            }, 1000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all";
    const labelCls = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1";
    const sectionTitleCls = "text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 mb-4 uppercase tracking-wider";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <UserPlus className="w-5 h-5" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Patient</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    <form id="add-patient-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Demographics */}
                        <div>
                            <h3 className={sectionTitleCls}>Demographics</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Given Name (First Name) *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.givenName}
                                        onChange={e => handleChange('givenName', e.target.value)}
                                        placeholder="e.g., John"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Family Name (Last Name) *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.familyName}
                                        onChange={e => handleChange('familyName', e.target.value)}
                                        placeholder="e.g., Doe"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Gender *</label>
                                    <select
                                        value={form.gender}
                                        onChange={e => handleChange('gender', e.target.value)}
                                        className={inputCls}
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                        <option value="unknown">Unknown</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Birth Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.birthDate}
                                        onChange={e => handleChange('birthDate', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>MRN (Medical Record Number)</label>
                                    <input
                                        type="text"
                                        value={form.mrn}
                                        onChange={e => handleChange('mrn', e.target.value)}
                                        placeholder="e.g., MRN-123456"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div>
                            <h3 className={sectionTitleCls}>Contact & Address</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className={labelCls}>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={e => handleChange('phone', e.target.value)}
                                        placeholder="e.g., +1 555-0100"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={e => handleChange('email', e.target.value)}
                                        placeholder="e.g., patient@example.com"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Address Line</label>
                                    <input
                                        type="text"
                                        value={form.addressLine}
                                        onChange={e => handleChange('addressLine', e.target.value)}
                                        placeholder="e.g., 123 Main St, Apt 4B"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>City</label>
                                    <input
                                        type="text"
                                        value={form.city}
                                        onChange={e => handleChange('city', e.target.value)}
                                        placeholder="e.g., New York"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>State</label>
                                    <input
                                        type="text"
                                        value={form.state}
                                        onChange={e => handleChange('state', e.target.value)}
                                        placeholder="e.g., NY"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Postal Code</label>
                                    <input
                                        type="text"
                                        value={form.postalCode}
                                        onChange={e => handleChange('postalCode', e.target.value)}
                                        placeholder="e.g., 10001"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Country</label>
                                    <input
                                        type="text"
                                        value={form.country}
                                        onChange={e => handleChange('country', e.target.value)}
                                        placeholder="e.g., USA"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Encounter */}
                        <div>
                            <h3 className={sectionTitleCls}>Initial Encounter Setup</h3>
                            <div className="bg-indigo-50 dark:bg-indigo-500/5 overflow-hidden rounded-xl border border-indigo-100 dark:border-indigo-500/20 p-4">
                                <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-4 font-medium flex gap-2">
                                    <span>ℹ️</span> 
                                    Creating a patient will automatically create an active encounter to maintain FHIR compliance.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Encounter Type *</label>
                                        <select
                                            value={form.encounterType}
                                            onChange={e => handleChange('encounterType', e.target.value)}
                                            className={inputCls}
                                        >
                                            <option value="ambulatory">Ambulatory (Outpatient)</option>
                                            <option value="inpatient">Inpatient Admission</option>
                                            <option value="emergency">Emergency Room</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Reason for Visit</label>
                                        <input
                                            type="text"
                                            value={form.encounterReason}
                                            onChange={e => handleChange('encounterReason', e.target.value)}
                                            placeholder="e.g., Initial Evaluation, Routine Checkup"
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl text-green-600 dark:text-green-400 text-sm font-medium flex items-center gap-2">
                                <Check className="w-5 h-5" />
                                Patient added successfully! Opening dashboard...
                            </div>
                        )}

                    </form>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors text-sm rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="add-patient-form"
                        disabled={loading || success}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:scale-105 active:scale-95"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : success ? (
                            <>
                                <Check className="w-4 h-4" />
                                Added!
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4" />
                                Add Patient
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
