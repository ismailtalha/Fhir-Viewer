'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Square, Settings2, Plus, Trash2, Activity, HeartPulse, Clock, FileWarning, Settings, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { SimplePatient } from '@/types/fhir';
import { ObservationSet, SimulationConfig, SimulationSequenceItem, SimulationStatus, PatientSimulationState } from './types';
import ObservationSetManager from './ObservationSetManager';

// Predefined vitals presets to easily add to a set
const VITAL_PRESETS = [
    { label: 'Heart Rate', display: 'Heart Rate', code: '8867-4', unit: 'bpm' },
    { label: 'Systolic BP', display: 'Systolic BP', code: '8480-6', unit: 'mmHg' },
    { label: 'Diastolic BP', display: 'Diastolic BP', code: '8462-4', unit: 'mmHg' },
    { label: 'SpO2', display: 'Oxygen Saturation', code: '59408-5', unit: '%' },
    { label: 'Temp (C)', display: 'Body Temperature', code: '8310-5', unit: '°C' },
    { label: 'Resp Rate', display: 'Respiratory Rate', code: '9279-1', unit: '/min' },
];

export default function SimulationDashboard() {
    // ---- 0. History State ----
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('fhir_simulation_history');
        if (saved) {
            try { setHistory(JSON.parse(saved)); } catch (e) {}
        }
    }, []);

    const saveToHistory = (record: any) => {
        setHistory(prev => {
            const next = [record, ...prev].slice(0, 20); // Keep last 20
            localStorage.setItem('fhir_simulation_history', JSON.stringify(next));
            return next;
        });
    };

    // ---- 1. Data Fetching & Global State ----
    const [patients, setPatients] = useState<SimplePatient[]>([]);
    const [loadingPatients, setLoadingPatients] = useState(true);

    useEffect(() => {
        fetch('/api/fhir/patients?_count=50')
            .then(res => res.json())
            .then(data => {
                if (data.patients) setPatients(data.patients);
            })
            .catch(err => console.error("Failed to load patients", err))
            .finally(() => setLoadingPatients(false));
    }, []);

    // ---- 2. Configuration State ----
    const [config, setConfig] = useState<SimulationConfig>({
        targetPatientIds: [],
        sequence: [],
        intervalMinutes: 1, // default 1 minute
    });

    const [observationSets, setObservationSets] = useState<ObservationSet[]>([
        {
            id: 'set-1',
            name: 'Critical',
            vitals: [
                { display: 'Heart Rate', code: '8867-4', value: '130', unit: 'bpm' },
                { display: 'Oxygen Saturation', code: '59408-5', value: '88', unit: '%' },
            ]
        },
        {
            id: 'set-2',
            name: 'Stable',
            vitals: [
                { display: 'Heart Rate', code: '8867-4', value: '75', unit: 'bpm' },
                { display: 'Oxygen Saturation', code: '59408-5', value: '98', unit: '%' },
            ]
        }
    ]);

    // UI state for creating/editing sets
    // ...

    // ---- 3. Engine State ----
    const [status, setStatus] = useState<SimulationStatus>('idle');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [countdownSeconds, setCountdownSeconds] = useState(0);
    const [patientStates, setPatientStates] = useState<Record<string, PatientSimulationState>>({});
    
    // Using refs for interval and up-to-date state access inside setInterval
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const configRef = useRef(config);
    const statusRef = useRef(status);
    const currentStepRef = useRef(currentStepIndex);
    const patientStatesRef = useRef(patientStates);
    const countdownRef = useRef(countdownSeconds);

    // Keep refs in sync
    useEffect(() => { configRef.current = config; }, [config]);
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { currentStepRef.current = currentStepIndex; }, [currentStepIndex]);
    useEffect(() => { patientStatesRef.current = patientStates; }, [patientStates]);
    useEffect(() => { countdownRef.current = countdownSeconds; }, [countdownSeconds]);

    // Added: Warn user if trying to leave or reload the page while simulation running
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (statusRef.current === 'running') {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires this to show the prompt
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // ---- Helper to execute API push ----
    const pushObservationSetToFHIR = async (patientId: string, setItem: ObservationSet) => {
        // Send a request per vital, or a batch if the backend supported it. The backend currently takes 1.
        // Wait, the backend `/api/fhir/patients/[id]/resources/create` creates ONE observation at a time.
        // We will loop over vitals and push them all.
        try {
            const requests = setItem.vitals.map(vital => 
                fetch(`/api/fhir/patients/${patientId}/resources/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        resourceType: 'Observation',
                        data: {
                            category: 'vital-signs',
                            display: vital.display,
                            code: vital.code || undefined,
                            value: vital.value,
                            unit: vital.unit || undefined,
                            effectiveDateTime: new Date().toISOString() // Current time of push
                        }
                    })
                })
            );
            
            const results = await Promise.all(requests);
            const hasError = results.some(r => !r.ok);
            if (hasError) throw new Error("Some vitals failed to push");
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const logToPatient = (patientId: string, msg: string, isError = false) => {
        setPatientStates(prev => {
            const st = prev[patientId];
            if (!st) return prev;
            return {
                ...prev,
                [patientId]: {
                    ...st,
                    logs: [`[${new Date().toLocaleTimeString()}] ${isError ? 'ERROR: ' : ''}${msg}`, ...st.logs].slice(0, 10)
                }
            };
        });
    };

    // ---- Engine Loop Function ----
    const executeStep = async (stepIndex: number) => {
        const sequenceItem = configRef.current.sequence[stepIndex];
        if (!sequenceItem) return;

        const obsSet = observationSets.find(s => s.id === sequenceItem.setId);
        if (!obsSet) return;

        // For each active patient in the simulation
        for (const pId of Object.keys(patientStatesRef.current)) {
            const pState = patientStatesRef.current[pId];
            if (pState.status === 'error' || pState.status === 'completed') continue;

            logToPatient(pId, `Pushing set: ${obsSet.name} (${obsSet.vitals.length} vitals)`);
            
            const success = await pushObservationSetToFHIR(pId, obsSet);
            
            if (success) {
                logToPatient(pId, `Success: ${obsSet.name}`);
                setPatientStates(prev => ({
                    ...prev,
                    [pId]: { ...prev[pId], currentStepIndex: stepIndex + 1 }
                }));
            } else {
                logToPatient(pId, `Failed to push ${obsSet.name}`, true);
                setPatientStates(prev => ({
                    ...prev,
                    [pId]: { ...prev[pId], status: 'error' }
                }));
            }
        }
    };

    const runSimulationLoop = () => {
        // Initial setup
        setStatus('running');
        setCurrentStepIndex(0);
        
        // Initialize patient states
        const initialStates: Record<string, PatientSimulationState> = {};
        config.targetPatientIds.forEach(id => {
            initialStates[id] = {
                patientId: id,
                status: 'active',
                currentStepIndex: 0,
                logs: ['Simulation initialized.']
            };
        });
        setPatientStates(initialStates);
        
        const totalSteps = config.sequence.length;
        if (totalSteps === 0) {
            setStatus('completed');
            return;
        }

        const completeSimulation = () => {
            setStatus('completed');
            setCountdownSeconds(0);
            setPatientStates(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => {
                    if (next[k].status === 'active') {
                        next[k].status = 'completed';
                        next[k].logs = [`[${new Date().toLocaleTimeString()}] Simulation Complete`, ...next[k].logs];
                    }
                });
                return next;
            });
            
            saveToHistory({
                id: Date.now().toString(),
                date: new Date().toISOString(),
                patientsCount: configRef.current.targetPatientIds.length,
                setsCount: configRef.current.sequence.length,
                status: 'Completed'
            });

            if (intervalRef.current) clearInterval(intervalRef.current);
        };

        // Execute step 0 immediately
        executeStep(0);
        setCurrentStepIndex(1); // the next step to execute will be 1
        
        if (1 >= totalSteps) {
            completeSimulation();
            return;
        }

        // Setup interval timer
        let secondsPassed = 0;
        const intervalTotalSeconds = config.intervalMinutes * 60;
        setCountdownSeconds(intervalTotalSeconds);

        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            if (statusRef.current !== 'running') {
                if (intervalRef.current) clearInterval(intervalRef.current);
                return;
            }

            secondsPassed++;
            const remaining = intervalTotalSeconds - secondsPassed;
            setCountdownSeconds(remaining > 0 ? remaining : 0);

            if (secondsPassed >= intervalTotalSeconds) {
                // Time for next step!
                const stepIdx = currentStepRef.current;
                
                if (stepIdx >= configRef.current.sequence.length) {
                    return; // Should be handled below now
                } else {
                    // Execute
                    executeStep(stepIdx);
                    const nextStep = stepIdx + 1;
                    setCurrentStepIndex(nextStep);
                    
                    if (nextStep >= configRef.current.sequence.length) {
                        completeSimulation();
                    } else {
                        // Reset ticker for next cycle
                        secondsPassed = 0;
                        setCountdownSeconds(intervalTotalSeconds);
                    }
                }
            }
        }, 1000); // tick every second for countdown UI
    };

    const stopSimulation = () => {
        setStatus('idle');
        if (intervalRef.current) clearInterval(intervalRef.current);
        
        if (status === 'running') {
            saveToHistory({
                id: Date.now().toString(),
                date: new Date().toISOString(),
                patientsCount: configRef.current.targetPatientIds.length,
                setsCount: currentStepRef.current, // How many were actually completed
                status: 'Stopped Early'
            });
        }
        
        setCountdownSeconds(0);
        setCurrentStepIndex(0);
    };

    // ---- Render Helpers ----
    const totalSteps = config.sequence.length;
    const isRunning = status === 'running';
    const canStart = config.targetPatientIds.length > 0 && config.sequence.length > 0 && !isRunning;

    return (
        <div className="h-full w-full flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex overflow-hidden shadow-sm">
            {/* Left Panel: Configuration */}
            <div className="w-[450px] flex-shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-indigo-500" />
                        Simulation Config
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Configure automated observation generation.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    
                    {/* 1. Observation Sets */}
                    <section className="space-y-3">
                        <ObservationSetManager sets={observationSets} onChange={setObservationSets} />
                    </section>

                    {/* 2. Select Patients */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 text-xs">1</span>
                            Target Patients
                        </h3>
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 max-h-48 overflow-y-auto custom-scrollbar">
                            {loadingPatients ? (
                                <p className="text-sm text-slate-500 text-center py-4">Loading patients...</p>
                            ) : patients.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No patients found.</p>
                            ) : (
                                <div className="space-y-1">
                                    {patients.map(p => {
                                        const isSelected = config.targetPatientIds.includes(p.id);
                                        return (
                                            <label key={p.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    disabled={isRunning}
                                                    onChange={() => {
                                                        setConfig(prev => ({
                                                            ...prev,
                                                            targetPatientIds: isSelected 
                                                                ? prev.targetPatientIds.filter(id => id !== p.id) 
                                                                : [...prev.targetPatientIds, p.id]
                                                        }));
                                                    }}
                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 disabled:opacity-50"
                                                />
                                                <span className={`text-sm font-medium ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {p.name}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 3. Sequence Builder */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 text-xs">2</span>
                            Execution Sequence
                        </h3>
                        
                        {/* Define sequence */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-3">
                            {config.sequence.length === 0 ? (
                                <div className="text-center py-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                    <p className="text-sm text-slate-500">No sets added to sequence.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {config.sequence.map((seq, idx) => {
                                        const setName = observationSets.find(s => s.id === seq.setId)?.name || 'Unknown';
                                        return (
                                            <div key={seq.id} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg group">
                                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                                                    {idx + 1}
                                                </div>
                                                <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">{setName}</span>
                                                <button 
                                                    disabled={isRunning}
                                                    onClick={() => setConfig(prev => ({ ...prev, sequence: prev.sequence.filter(s => s.id !== seq.id) }))}
                                                    className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            
                            <div className="flex gap-2">
                                <select 
                                    disabled={isRunning}
                                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    id="add-set-select"
                                >
                                    {observationSets.map(s => <option key={s.id} value={s.id}>{s.name} ({s.vitals.length} vitals)</option>)}
                                </select>
                                <button 
                                    disabled={isRunning}
                                    onClick={() => {
                                        const select = document.getElementById('add-set-select') as HTMLSelectElement;
                                        if (select.value) {
                                            setConfig(prev => ({
                                                ...prev,
                                                sequence: [...prev.sequence, { id: `seq-${Date.now()}`, setId: select.value }]
                                            }));
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-lg font-medium text-sm transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" /> Add
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* 4. Interval */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 text-xs">3</span>
                            Interval
                        </h3>
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                            <Clock className="w-5 h-5 text-slate-400" />
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Push Every (Minutes)</label>
                                <input 
                                    type="number" 
                                    min="0.1" 
                                    step="0.1"
                                    disabled={isRunning}
                                    value={config.intervalMinutes}
                                    onChange={e => setConfig(prev => ({ ...prev, intervalMinutes: parseFloat(e.target.value) || 0 }))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="text-[10px] text-slate-400 max-w-[120px] leading-tight mt-4">
                                Determines the time pause between sequence steps.
                            </div>
                        </div>
                    </section>

                    {/* 5. Execution History */}
                    {history.length > 0 && (
                        <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 text-xs">5</span>
                                    History
                                </span>
                                <button onClick={() => { setHistory([]); localStorage.removeItem('fhir_simulation_history'); }} className="text-[10px] text-slate-400 hover:text-red-500 uppercase font-bold tracking-wider transition-colors">Clear</button>
                            </h3>
                            <div className="flex flex-col gap-2">
                                {history.map(run => (
                                    <div key={run.id} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-xs">
                                        <div className="flex items-center justify-between font-bold mb-1">
                                            <span className="text-slate-700 dark:text-slate-300">{new Date(run.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                            <span className={run.status === 'Completed' ? 'text-green-500' : 'text-amber-500'}>{run.status}</span>
                                        </div>
                                        <div className="text-slate-500 flex items-center gap-2 text-[11px] font-medium">
                                            <span>{run.patientsCount} pt{run.patientsCount !== 1 ? 's' : ''}</span>
                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                            <span>{run.setsCount} steps executed</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                </div>

                {/* Warning and Footer / Controls */}
                <div className="flex flex-col border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 shrink-0">
                    {isRunning && (
                        <div className="mx-4 mt-4 p-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            Please do not refresh the page or you will lose the running simulation state.
                        </div>
                    )}
                    <div className="p-4">
                    {isRunning ? (
                        <button 
                            onClick={stopSimulation}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 font-semibold rounded-xl transition-all shadow-sm border border-red-200 dark:border-red-500/20"
                        >
                            <Square className="w-4 h-4 fill-current" />
                            Stop Simulation
                        </button>
                    ) : status === 'completed' ? (
                        <button 
                            onClick={stopSimulation} // Resets state
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all shadow-sm"
                        >
                            <Settings className="w-4 h-4" />
                            Reset Configuration
                        </button>
                    ) : (
                        <button 
                            disabled={!canStart}
                            onClick={runSimulationLoop}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            Start Simulation
                        </button>
                    )}
                    </div>
                </div>
            </div>

            {/* Right Panel: Visualization */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
                
                {/* Header Stats */}
                <div className="grid grid-cols-4 gap-4 p-6 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
                    <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</span>
                        <div className="flex items-center gap-2 mt-auto">
                            {status === 'idle' ? <div className="w-3 h-3 rounded-full bg-slate-300" /> :
                             status === 'running' ? <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" /> :
                             status === 'completed' ? <div className="w-3 h-3 rounded-full bg-green-500" /> :
                             <div className="w-3 h-3 rounded-full bg-red-500" />}
                            <span className="text-lg font-bold text-slate-900 dark:text-white capitalize">{status}</span>
                        </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Progress</span>
                        <div className="mt-auto flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white leading-none">{currentStepIndex}</span>
                            <span className="text-sm font-medium text-slate-500">/ {totalSteps} sets</span>
                        </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Est. Time Left</span>
                        <div className="mt-auto flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white leading-none">
                                {status === 'completed' ? '0' :
                                 status === 'idle' ? (totalSteps > 0 ? ((totalSteps - 1) * config.intervalMinutes).toFixed(1) : '0') :
                                 (((totalSteps - currentStepIndex) * config.intervalMinutes * 60 + countdownSeconds) / 60).toFixed(1)
                                }
                            </span>
                            <span className="text-sm font-medium text-slate-500">min</span>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Next Push In</span>
                        <div className="mt-auto flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 leading-none">
                                {status === 'running' && currentStepIndex < totalSteps ? countdownSeconds : 0}
                            </span>
                            <span className="text-sm font-medium text-slate-500">sec</span>
                        </div>
                    </div>
                </div>

                {/* Main Visualization Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900">
                    <div className="max-w-4xl mx-auto space-y-8">
                        
                        {/* Overall Progress Bar */}
                        {totalSteps > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm font-medium">
                                    <span className="text-slate-700 dark:text-slate-300">Overall Simulation Progress</span>
                                    <span className="text-indigo-600 dark:text-indigo-400">{Math.round((currentStepIndex / totalSteps) * 100)}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                                        style={{ width: `${(currentStepIndex / totalSteps) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Patient Active Status Cards */}
                        {status !== 'idle' && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                                    <Activity className="w-5 h-5 text-indigo-500" />
                                    Live Patient Connections
                                </h3>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {Object.values(patientStates).map(ps => {
                                        const pName = patients.find(p => p.id === ps.patientId)?.name || 'Unknown Patient';
                                        
                                        return (
                                            <div key={ps.patientId} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col">
                                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-3 mb-3 shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                                            <User className="w-4 h-4 text-slate-500" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{pName}</div>
                                                            <div className="text-xs text-slate-500 font-mono">{ps.patientId}</div>
                                                        </div>
                                                    </div>
                                                    {ps.status === 'completed' ? (
                                                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2.5 py-1 rounded-full">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Done
                                                        </span>
                                                    ) : ps.status === 'error' ? (
                                                        <span className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-full">
                                                            <AlertCircle className="w-3.5 h-3.5" /> Error
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">
                                                            <Activity className="w-3.5 h-3.5 animate-pulse" /> Active
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex-1 bg-slate-950 rounded-xl p-3 font-mono text-[11px] overflow-y-auto max-h-40 custom-scrollbar shadow-inner">
                                                    {ps.logs.length === 0 ? (
                                                        <span className="text-slate-600">Waiting for simulation to start...</span>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            {ps.logs.map((log, i) => (
                                                                <div key={i} className={`${i === 0 ? 'text-indigo-300 font-semibold' : 'text-slate-500'} ${log.includes('ERROR') ? 'text-red-400' : ''}`}>
                                                                    {log}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {status === 'idle' && (
                            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
                                <Activity className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                                <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Simulation Not Started</p>
                                <p className="text-sm max-w-sm mt-2">Configure target patients, sequence items, and time interval on the left, then click Start Simulation.</p>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
