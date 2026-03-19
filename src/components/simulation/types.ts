export interface VitalMeasurement {
    code: string;
    display: string;
    value: string; // Stored as string to allow things like "120/80" or just "120"
    unit: string;
}

export interface ObservationSet {
    id: string;
    name: string;
    vitals: VitalMeasurement[];
}

export interface SimulationSequenceItem {
    id: string;
    setId: string; // references ObservationSet.id
}

export interface SimulationConfig {
    targetPatientIds: string[];
    sequence: SimulationSequenceItem[];
    intervalMinutes: number;
}

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface PatientSimulationState {
    patientId: string;
    status: 'pending' | 'active' | 'completed' | 'error';
    currentStepIndex: number; 
    logs: string[];
}
