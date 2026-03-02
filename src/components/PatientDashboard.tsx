'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Phone, MapPin, Calendar, Activity, FileHeart, Loader2, RefreshCw, Plus, FileText } from 'lucide-react';
import { PatientDashboard as PatientDashboardType, SimplePatient, TimelineEvent } from '@/types/fhir';
import VitalsChart from './VitalsChart';
import ConditionsList from './ConditionsList';
import EncountersList from './EncountersList';
import ProceduresList from './ProceduresList';
import ObservationsList from './ObservationsList';
import PatientTimeline from './PatientTimeline';
import TimelineGraph from './TimelineGraph';
import AgentChat from './AgentChat';
import PatientStats from './PatientStats';
import ClinicalJourney from './ClinicalJourney';
import DocumentsList from './DocumentsList';
import AddResourceModal from './AddResourceModal';
import FullscreenCard from './FullscreenCard';
import PatientDemographics from './PatientDemographics';

interface PatientDashboardProps {
    patient: SimplePatient;
}

export default function PatientDashboard({ patient }: PatientDashboardProps) {
    const [dashboard, setDashboard] = useState<PatientDashboardType | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'assistant' | 'documents'>('overview');
    const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/fhir/patients/${patient.id}/dashboard`);
            const data = await response.json();
            if (!data.error) {
                setDashboard(data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, [patient.id]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const timelineEvents = useMemo((): TimelineEvent[] => {
        if (!dashboard) return [];

        const events: TimelineEvent[] = [];

        // Aggregate Conditions
        dashboard.conditions.resources.forEach(cond => {
            events.push({
                id: cond.id,
                type: 'condition',
                title: cond.display,
                description: `Condition diagnosed: ${cond.display}. Status: ${cond.clinicalStatus}`,
                timestamp: cond.onsetDateTime || new Date().toISOString(),
                status: cond.clinicalStatus,
                raw: cond
            });
        });

        // Aggregate Encounters
        dashboard.encounters.resources.forEach(enc => {
            events.push({
                id: enc.id,
                type: 'encounter',
                title: enc.type,
                description: `Clinical Encounter: ${enc.reason}`,
                timestamp: enc.start || enc.period.split(' - ')[0] || new Date().toISOString(),
                status: enc.status,
                raw: enc
            });
        });

        // Aggregate Procedures
        dashboard.procedures.resources.forEach(proc => {
            events.push({
                id: proc.id,
                type: 'procedure',
                title: proc.display,
                description: `Procedure performed: ${proc.display}`,
                timestamp: proc.performedDateTime || new Date().toISOString(),
                status: proc.status,
                raw: proc
            });
        });

        // Aggregate Observations
        dashboard.observations.resources.forEach(obs => {
            events.push({
                id: obs.id,
                type: 'observation',
                title: obs.display,
                description: `${obs.display} recorded: ${obs.value} ${obs.unit}`,
                timestamp: obs.effectiveDateTime,
                value: obs.value,
                unit: obs.unit,
                category: obs.category,
                raw: obs
            });
        });

        // Add Lab Results if separate
        dashboard.labResults.resources.forEach(obs => {
            events.push({
                id: obs.id,
                type: 'observation',
                title: obs.display,
                description: `Lab Result: ${obs.display} = ${obs.value} ${obs.unit}`,
                timestamp: obs.effectiveDateTime,
                value: obs.value,
                unit: obs.unit,
                category: 'laboratory',
                raw: obs
            });
        });

        // Sort by timestamp descending
        return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [dashboard]);

    const handleStatClick = (type: 'encounter' | 'observation' | 'condition' | 'procedure' | 'timeline' | 'document') => {
        if (type === 'timeline') {
            setActiveTab('timeline');
            return;
        }

        if (type === 'document') {
            setActiveTab('documents');
            return;
        }

        setActiveTab('overview');
        setTimeout(() => {
            const id = `${type}-section`;
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                element.classList.add('ring-2', 'ring-blue-500/50');
                setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500/50'), 2000);
            }
        }, 100);
    };

    const handleLoadMore = async (type: 'condition' | 'encounter' | 'procedure' | 'observation' | 'document') => {
        if (!dashboard) return;

        let offset: string | undefined;
        switch (type) {
            case 'condition': offset = dashboard.conditions.nextOffset; break;
            case 'encounter': offset = dashboard.encounters.nextOffset; break;
            case 'procedure': offset = dashboard.procedures.nextOffset; break;
            case 'observation': offset = dashboard.observations.nextOffset; break;
            case 'document': offset = dashboard.documents.nextOffset; break;
        }

        if (!offset) return;

        setLoadingMore(prev => ({ ...prev, [type]: true }));
        try {
            const res = await fetch(`/api/fhir/patients/${patient.id}/resources?type=${type}&_getpagesoffset=${offset}`);
            const data = await res.json();

            if (data.resources) {
                setDashboard(prev => {
                    if (!prev) return null;
                    const updated = { ...prev };
                    switch (type) {
                        case 'condition':
                            updated.conditions = {
                                resources: [...prev.conditions.resources, ...data.resources],
                                nextOffset: data.nextOffset
                            };
                            break;
                        case 'encounter':
                            updated.encounters = {
                                resources: [...prev.encounters.resources, ...data.resources],
                                nextOffset: data.nextOffset
                            };
                            break;
                        case 'procedure':
                            updated.procedures = {
                                resources: [...prev.procedures.resources, ...data.resources],
                                nextOffset: data.nextOffset
                            };
                            break;
                        case 'observation':
                            updated.observations = {
                                resources: [...prev.observations.resources, ...data.resources],
                                nextOffset: data.nextOffset
                            };
                            break;
                        case 'document':
                            updated.documents = {
                                resources: [...prev.documents.resources, ...data.resources],
                                nextOffset: data.nextOffset
                            };
                            break;
                    }
                    return updated;
                });
            }
        } catch (error) {
            console.error('Error loading more:', error);
        } finally {
            setLoadingMore(prev => ({ ...prev, [type]: false }));
        }
    };

    const lengthOfStay = useMemo((): string => {
        if (timelineEvents.length === 0) return '0 days';

        const timestamps = timelineEvents.map((e: TimelineEvent) => new Date(e.timestamp).getTime()).filter((t: number) => !isNaN(t));
        if (timestamps.length === 0) return '0 days';

        const firstInteraction = Math.min(...timestamps);
        const lastInteraction = Math.max(...timestamps);

        const totalMs = lastInteraction - firstInteraction;
        if (totalMs <= 0) return '1 hour'; // Minimum 1 hour if only one event exists

        const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
        if (days >= 1) {
            const remainingHours = Math.round((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`;
        }

        const hours = Math.round(totalMs / (1000 * 60 * 60));
        return `${hours || 1} hours`;
    }, [timelineEvents]);

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

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-2 overflow-hidden">
            {/* Patient Demographics Card */}
            <PatientDemographics
                patient={dashboard?.patient || patient}
                onUpdate={fetchDashboard}
            />

            {/* Navigation Tabs */}
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 shadow-sm flex items-center justify-between">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200 dark:border-slate-700/50">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'timeline' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        Timeline
                    </button>
                    <button
                        onClick={() => setActiveTab('assistant')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'assistant' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        AI Assistant
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'documents' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        Documents
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-green-500/20"
                        title="Add new resource"
                    >
                        <Plus className="w-4 h-4" />
                        Add Resource
                    </button>
                    <button
                        onClick={fetchDashboard}
                        className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all"
                        title="Refresh dashboard"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="shrink-0">
                <PatientStats
                    counts={{
                        encounters: dashboard?.encounters.total || dashboard?.encounters.resources.length || 0,
                        observations: dashboard?.observations.total || dashboard?.observations.resources.length || 0,
                        conditions: dashboard?.conditions.total || dashboard?.conditions.resources.length || 0,
                        procedures: dashboard?.procedures.total || dashboard?.procedures.resources.length || 0,
                        documents: dashboard?.documents.total || dashboard?.documents.resources.length || 0
                    }}
                    lengthOfStay={lengthOfStay}
                    onStatClick={handleStatClick}
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden mt--2">
                <div className="h-full overflow-hidden">
                    {/* Main Column */}
                    <div className="h-full overflow-hidden overflow-y-auto pr-2 custom-scrollbar">
                        {activeTab === 'overview' ? (
                            <div className="flex flex-col gap-4">
                                {/* Clinical Journey Pathway */}
                                <ClinicalJourney events={timelineEvents} />

                                {/* Vitals */}
                                <FullscreenCard
                                    icon={<Activity className="w-5 h-5 text-green-500 dark:text-green-400" />}
                                    title="Vital Signs"
                                    subtitle="All recorded vital-sign observations for this patient"
                                    className="!h-auto shrink-0"
                                >
                                    <VitalsChart vitals={dashboard?.vitals.resources || []} />
                                </FullscreenCard>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                                    {/* Conditions */}
                                    <div id="condition-section">
                                        <FullscreenCard
                                            icon={<FileHeart className="w-5 h-5 text-red-500 dark:text-red-400" />}
                                            title="Conditions"
                                            subtitle="Active, resolved and inactive clinical conditions"
                                            footer={
                                                dashboard?.conditions.nextOffset ? (
                                                    <button
                                                        onClick={() => handleLoadMore('condition')}
                                                        disabled={loadingMore.condition}
                                                        className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20 disabled:opacity-50"
                                                    >
                                                        {loadingMore.condition ? 'Loading...' : 'Load More'}
                                                    </button>
                                                ) : undefined
                                            }
                                        >
                                            <ConditionsList conditions={dashboard?.conditions.resources || []} />
                                        </FullscreenCard>
                                    </div>

                                    {/* Encounters */}
                                    <div id="encounter-section">
                                        <FullscreenCard
                                            icon={<Calendar className="w-5 h-5 text-indigo-500 dark:text-blue-400" />}
                                            title="Encounters"
                                            subtitle="All clinical visits and hospital encounters"
                                            footer={
                                                dashboard?.encounters.nextOffset ? (
                                                    <button
                                                        onClick={() => handleLoadMore('encounter')}
                                                        disabled={loadingMore.encounter}
                                                        className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20 disabled:opacity-50"
                                                    >
                                                        {loadingMore.encounter ? 'Loading...' : 'Load More'}
                                                    </button>
                                                ) : undefined
                                            }
                                        >
                                            <EncountersList encounters={dashboard?.encounters.resources || []} />
                                        </FullscreenCard>
                                    </div>

                                    {/* Procedures */}
                                    <div id="procedure-section">
                                        <FullscreenCard
                                            icon={<Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                                            title="Procedures"
                                            subtitle="Surgical procedures and clinical interventions"
                                            footer={
                                                dashboard?.procedures.nextOffset ? (
                                                    <button
                                                        onClick={() => handleLoadMore('procedure')}
                                                        disabled={loadingMore.procedure}
                                                        className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20 disabled:opacity-50"
                                                    >
                                                        {loadingMore.procedure ? 'Loading...' : 'Load More'}
                                                    </button>
                                                ) : undefined
                                            }
                                        >
                                            <ProceduresList procedures={dashboard?.procedures.resources || []} />
                                        </FullscreenCard>
                                    </div>

                                    {/* Observations */}
                                    <div id="observation-section">
                                        <FullscreenCard
                                            icon={<Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
                                            title="Observations"
                                            subtitle="Lab results, vitals, and other clinical measurements"
                                            footer={
                                                dashboard?.observations.nextOffset ? (
                                                    <button
                                                        onClick={() => handleLoadMore('observation')}
                                                        disabled={loadingMore.observation}
                                                        className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20 disabled:opacity-50"
                                                    >
                                                        {loadingMore.observation ? 'Loading...' : 'Load More'}
                                                    </button>
                                                ) : undefined
                                            }
                                        >
                                            <ObservationsList observations={dashboard?.observations.resources || []} />
                                        </FullscreenCard>
                                    </div>

                                    {/* Clinical Documents */}
                                    <div id="document-section">
                                        <FullscreenCard
                                            icon={<FileText className="w-5 h-5 text-amber-500" />}
                                            title="Clinical Documents"
                                            subtitle="Attachments, imaging reports, and clinical summaries"
                                            footer={
                                                dashboard?.documents.nextOffset ? (
                                                    <button
                                                        onClick={() => handleLoadMore('document')}
                                                        disabled={loadingMore.document}
                                                        className="w-full py-2 text-sm text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 rounded-lg transition-colors border border-indigo-500/20 disabled:opacity-50"
                                                    >
                                                        {loadingMore.document ? 'Loading...' : 'Load More'}
                                                    </button>
                                                ) : undefined
                                            }
                                        >
                                            <DocumentsList documents={dashboard?.documents.resources || []} />
                                        </FullscreenCard>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'timeline' ? (
                            <div className="flex flex-col gap-6 pb-8">
                                {/* Visual Graph */}
                                <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shrink-0 h-[300px] shadow-sm">
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Patient Journey Visualization</h3>
                                    <TimelineGraph events={timelineEvents} />
                                </div>

                                {/* Timeline List */}
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 pl-4 font-display">Chronological Timeline</h3>
                                    <PatientTimeline events={timelineEvents} />
                                </div>
                            </div>
                        ) : activeTab === 'documents' ? (
                            <div className="flex flex-col gap-6 pb-8 h-full overflow-hidden">
                                <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex flex-col h-full shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                                <FileText className="w-6 h-6 text-amber-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Document Repository</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">View and manage clinical attachments, imaging reports, and summaries</p>
                                            </div>
                                        </div>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all">
                                            <FileText className="w-4 h-4" />
                                            Request New
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                        <DocumentsList documents={dashboard?.documents.resources || []} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col overflow-hidden pb-4">
                                <AgentChat patientId={patient.id} onAction={fetchDashboard} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Resource Modal */}
            <AddResourceModal
                patientId={patient.id}
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={fetchDashboard}
                encounters={dashboard?.encounters.resources || []}
            />
        </div>
    );
}
