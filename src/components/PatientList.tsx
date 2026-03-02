'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, User, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { SimplePatient } from '@/types/fhir';

interface PatientListProps {
    selectedPatientId: string | null;
    onSelectPatient: (patient: SimplePatient) => void;
}

export default function PatientList({ selectedPatientId, onSelectPatient }: PatientListProps) {
    const [patients, setPatients] = useState<SimplePatient[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [nextOffset, setNextOffset] = useState<string | undefined>(undefined);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

    const fetchPatients = useCallback(async (name?: string, offset?: string, append = false) => {
        if (!append) setLoading(true);
        else setLoadingMore(true);

        try {
            const params = new URLSearchParams();
            if (name) params.append('name', name);
            params.append('_count', '30');
            if (offset) params.append('_getpagesoffset', offset);

            const response = await fetch(`/api/fhir/patients?${params.toString()}`);
            const data = await response.json();

            if (data.patients) {
                setPatients(prev => append ? [...prev, ...data.patients] : data.patients);
                setNextOffset(data.nextOffset);
            }
        } catch (error) {
            console.error('Failed to fetch patients:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);

        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        const timeout = setTimeout(() => {
            fetchPatients(query || undefined);
        }, 500);

        setSearchTimeout(timeout);
    };

    const handleLoadMore = () => {
        if (nextOffset && !loadingMore) {
            fetchPatients(searchQuery || undefined, nextOffset, true);
        }
    };

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

    const getGenderColor = (gender: string): string => {
        switch (gender) {
            case 'male':
                return 'bg-blue-500/20 text-blue-400';
            case 'female':
                return 'bg-pink-500/20 text-pink-400';
            default:
                return 'bg-slate-500/20 text-slate-400';
        }
    };

    return (
        <div className="h-full flex flex-col bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden backdrop-blur-md">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Patients</h2>
                    <button
                        onClick={() => fetchPatients(searchQuery || undefined)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search patients..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600/50 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                    />
                </div>
            </div>

            {/* Patient List */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                ) : patients.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No patients found</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {patients.map((patient) => (
                            <button
                                key={patient.id}
                                onClick={() => onSelectPatient(patient)}
                                className={`w-full p-3 rounded-xl text-left transition-all ${selectedPatientId === patient.id
                                    ? 'bg-indigo-500/10 border border-indigo-500/50'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-900 dark:text-white font-medium truncate">{patient.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${getGenderColor(patient.gender)}`}>
                                                {patient.gender || 'Unknown'}
                                            </span>
                                            {patient.birthDate && (
                                                <span className="text-xs text-slate-500">
                                                    {calculateAge(patient.birthDate)} yrs
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}

                        {/* Load More Button */}
                        {nextOffset && (
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="w-full py-3 mt-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-slate-800/50 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {loadingMore ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                                Load More
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-700/50 text-center">
                <p className="text-xs text-slate-500">
                    {patients.length} patient{patients.length !== 1 ? 's' : ''} loaded
                </p>
            </div>
        </div>
    );
}
