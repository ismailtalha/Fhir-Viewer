'use client';

import { useState } from 'react';
import {
    User, MapPin, Calendar, Edit2, Save, X,
    IdCard, Phone, Users, HeartPulse, Bed, MoveHorizontal, CheckCircle2
} from 'lucide-react';
import { SimplePatient, FHIRLocation } from '@/types/fhir';

interface PatientDemographicsProps {
    patient: SimplePatient;
    onUpdate: () => void;
}

export default function PatientDemographics({ patient, onUpdate }: PatientDemographicsProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [availableLocations, setAvailableLocations] = useState<FHIRLocation[]>([]);
    const [isAssigning, setIsAssigning] = useState(false);

    const [formData, setFormData] = useState({
        birthDate: patient.birthDate,
        address: patient.address || '',
        codeStatus: patient.codeStatus || 'Full Code',
        admissionDiagnosis: patient.admissionDiagnosis || '',
        primaryDoctor: patient.primaryDoctor || '',
        familyContact: patient.contacts?.[0]?.name || ''
    });

    const calculateAge = (birthDate: string): number => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/fhir/patients/${patient.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientUpdate: {
                        birthDate: formData.birthDate,
                        address: [{ text: formData.address }],
                        generalPractitioner: [{ display: formData.primaryDoctor }],
                        contact: [{ name: { text: formData.familyContact }, relationship: [{ text: 'Primary Contact' }] }]
                    },
                    codeStatus: formData.codeStatus,
                    admissionDiagnosis: formData.admissionDiagnosis
                })
            });

            if (response.ok) {
                setIsEditing(false);
                setIsMenuOpen(false);
                onUpdate();
            }
        } catch (error) {
            console.error('Failed to update demographics:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLocations = async () => {
        try {
            const response = await fetch('/api/fhir/locations');
            if (response.ok) {
                const data = await response.json();
                setAvailableLocations(data);
            }
        } catch (error) {
            console.error('Failed to fetch locations:', error);
        }
    };

    const handleAssignLocation = async (locId: string, locName: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/fhir/patients/${patient.id}/assign-location`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locationId: locId, locationName: locName })
            });
            if (response.ok) {
                setIsAssigning(false);
                onUpdate();
            }
        } catch (error) {
            console.error('Failed to assign location:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Compact Header Card */}
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-3 shadow-sm group">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Compact Avatar */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/10 shrink-0">
                            <User className="w-5 h-5 text-white" />
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">{patient.name}</h2>
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${patient.codeStatus?.includes('DNR')
                                        ? 'bg-red-500 text-white'
                                        : 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
                                        }`}>
                                        {patient.codeStatus || 'Full Code'}
                                    </span>
                                    {patient.deceased && (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wider">Fatal</span>
                                    )}
                                    {patient.location && (
                                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                            <Bed className="w-2.5 h-2.5" />
                                            {patient.location}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800/50 px-1.5 rounded">
                                    MRN: <code className="text-[10px] text-indigo-500">{patient.mrn}</code>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {calculateAge(patient.birthDate)}Y • {patient.birthDate}
                                </span>
                                <span className="px-1.5 uppercase font-bold text-[9px] bg-slate-100 dark:bg-slate-800/50 rounded">{patient.gender}</span>
                                {patient.address && (
                                    <span className="flex items-center gap-1 truncate max-w-[200px] border-l border-slate-200 dark:border-slate-700 pl-3 hidden sm:flex">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {patient.address}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className="p-2 text-slate-500 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all"
                            title="View all details / Edit"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Demographics Details Modal */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                    <IdCard className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Patient Information</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Comprehensive demographic and clinical details</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsMenuOpen(false); setIsEditing(false); setIsAssigning(false); }}
                                className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {isAssigning ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-indigo-500 flex items-center gap-2">
                                            <MoveHorizontal className="w-4 h-4" />
                                            Transfer Patient
                                        </h4>
                                        <button onClick={() => setIsAssigning(false)} className="text-xs text-slate-500 hover:text-slate-900 font-bold uppercase tracking-wider">Back</button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        <p className="text-[11px] text-slate-500 bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10 mb-2 font-medium">
                                            Select a new location to transfer this patient. This will complete the current location assignment and create a new active record.
                                        </p>
                                        <div className="max-h-[350px] overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                                            {availableLocations.length === 0 ? (
                                                <div className="text-center py-12 text-slate-400 text-sm italic">Loading hospital locations...</div>
                                            ) : (
                                                availableLocations.map((loc) => (
                                                    <button
                                                        key={loc.id}
                                                        onClick={() => handleAssignLocation(loc.id!, loc.name!)}
                                                        disabled={loading}
                                                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all ${patient.locationId === loc.id
                                                            ? 'bg-indigo-500 border-indigo-600 shadow-lg shadow-indigo-500/20'
                                                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-indigo-500/50'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-xl ${patient.locationId === loc.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                                <Bed className={`w-4 h-4 ${patient.locationId === loc.id ? 'text-white' : 'text-slate-500'}`} />
                                                            </div>
                                                            <div className="text-left">
                                                                <span className={`text-sm font-bold block ${patient.locationId === loc.id ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                    {loc.name}
                                                                </span>
                                                                <span className={`text-[10px] font-medium ${patient.locationId === loc.id ? 'text-indigo-100' : 'text-slate-500'}`}>
                                                                    {loc.physicalType?.coding?.[0]?.display || 'Inpatient Bed'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {patient.locationId === loc.id ? (
                                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                                        ) : (
                                                            <span className="text-[10px] text-indigo-500 font-bold px-2.5 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20">Select</span>
                                                        )}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : !isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <Section title="Clinical Profile" icon={<HeartPulse className="w-4 h-4" />}>
                                            <DataField label="Code Status" value={patient.codeStatus} highlighted={patient.codeStatus?.includes('DNR')} />
                                            <div className="flex items-center justify-between group/loc p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors -ml-2">
                                                <DataField label="Current Location" value={patient.location || 'Not Assigned'} />
                                                <button
                                                    onClick={() => { setIsAssigning(true); fetchLocations(); }}
                                                    className="p-1.5 text-indigo-500 hover:bg-indigo-500 hover:text-white rounded-lg transition-all opacity-0 group-hover/loc:opacity-100 shadow-sm"
                                                    title="Transfer Patient"
                                                >
                                                    <MoveHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <DataField label="Admission Diagnosis" value={patient.admissionDiagnosis} />
                                            <DataField label="Primary Doctor" value={patient.primaryDoctor} />
                                        </Section>

                                        <Section title="Identification" icon={<IdCard className="w-4 h-4" />}>
                                            <DataField label="MRN" value={patient.mrn} />
                                            <div className="space-y-1 mt-2 font-mono">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Other Identifiers</span>
                                                {patient.identifiers.map((id, i) => (
                                                    <div key={i} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                                                        <span className="text-slate-500">{id.type}</span>
                                                        <span className="text-slate-700 dark:text-slate-300">{id.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </Section>
                                    </div>

                                    <div className="space-y-6">
                                        <Section title="Communication" icon={<Phone className="w-4 h-4" />}>
                                            <DataField label="Phone" value={patient.phone} />
                                            <DataField label="Address" value={patient.address} longText />
                                        </Section>

                                        <Section title="Care Team & Contacts" icon={<Users className="w-4 h-4" />}>
                                            {patient.contacts.map((contact, i) => (
                                                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50 mb-2">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{contact.name}</span>
                                                        <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded font-bold uppercase">{contact.relationship}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Phone className="w-3 h-3" /> {contact.phone || 'No phone'}
                                                    </div>
                                                </div>
                                            ))}
                                        </Section>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <h4 className="text-sm font-bold text-indigo-500 flex items-center gap-2 mb-4 uppercase tracking-wider">
                                        <Edit2 className="w-4 h-4" />
                                        Edit mode active
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField label="Birth Date" type="date" value={formData.birthDate} onChange={(val) => setFormData({ ...formData, birthDate: val })} />
                                        <SelectField
                                            label="Code Status"
                                            value={formData.codeStatus}
                                            options={['Full Code', 'DNR', 'DNI', 'DNR/DNI']}
                                            onChange={(val) => setFormData({ ...formData, codeStatus: val })}
                                        />
                                        <div className="md:col-span-2">
                                            <TextAreaField label="Full Address" value={formData.address} onChange={(val) => setFormData({ ...formData, address: val })} />
                                        </div>
                                        <InputField label="Admission Diagnosis" value={formData.admissionDiagnosis} onChange={(val) => setFormData({ ...formData, admissionDiagnosis: val })} />
                                        <InputField label="Primary Doctor" value={formData.primaryDoctor} onChange={(val) => setFormData({ ...formData, primaryDoctor: val })} />
                                        <InputField label="Family / Primary Contact" value={formData.familyContact} onChange={(val) => setFormData({ ...formData, familyContact: val })} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                            {!isEditing && !isAssigning ? (
                                <>
                                    <span className="text-[10px] text-slate-400 font-mono">ID: {patient.id}</span>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        Edit Details
                                    </button>
                                </>
                            ) : isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-sm hover:underline"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="px-8 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-500/20 transition-all flex items-center gap-2"
                                    >
                                        {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                                    </button>
                                </>
                            ) : (
                                <div className="w-full flex justify-between items-center text-xs text-slate-400 italic">
                                    <span>Select a location above to confirm transfer</span>
                                    {loading && <span className="animate-pulse">Processing...</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Helper Components
function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400">
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-widest">{title}</span>
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function DataField({ label, value, highlighted = false, longText = false }: { label: string, value?: string, highlighted?: boolean, longText?: boolean }) {
    return (
        <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 mb-0.5">{label}</span>
            <span className={`text-sm ${longText ? 'text-xs leading-relaxed' : 'font-bold'} ${highlighted ? 'text-red-500 font-black' : 'text-slate-700 dark:text-slate-200'}`}>
                {value || 'Not available'}
            </span>
        </div>
    );
}

function InputField({ label, type = 'text', value, onChange }: { label: string, type?: string, value: string, onChange: (val: string) => void }) {
    return (
        <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-100"
            />
        </div>
    );
}

function TextAreaField({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) {
    return (
        <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-all min-h-[80px] text-slate-800 dark:text-slate-100"
            />
        </div>
    );
}

function SelectField({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (val: string) => void }) {
    return (
        <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-all appearance-none text-slate-800 dark:text-slate-100"
                >
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                </div>
            </div>
        </div>
    );
}
