import { NextRequest, NextResponse } from 'next/server';
import { groq } from '@ai-sdk/groq';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { FHIRClient } from '@/lib/fhir-client';
import { getConnection } from '@/lib/session';
import { FHIRCondition, FHIRProcedure } from '@/types/fhir';

export const runtime = 'edge';

interface AgentRequest {
    message: string;
    patientId?: string;
}

interface AgentResponse {
    response: string;
    actions: Array<{
        type: string;
        resourceType: string;
        resourceId?: string;
        success: boolean;
    }>;
}

export async function POST(request: NextRequest): Promise<NextResponse<AgentResponse | { error: string }>> {
    console.log('AGENT: Received request');
    try {
        const connection = await getConnection();

        if (!connection) {
            return NextResponse.json({ error: 'Not connected to a FHIR server' }, { status: 401 });
        }

        const body: AgentRequest = await request.json();
        const { message, patientId: contextPatientId } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const client = new FHIRClient(connection);
        const actions: AgentResponse['actions'] = [];

        // System prompt for the agent
        const systemPrompt = `You are a FHIR clinical data assistant. Your mission is to perform accurate CRUD operations on patient records.

CURRENT CONTEXT:
${contextPatientId ? `- Active Patient: Patient/${contextPatientId}
- Use this ID automatically for all operations unless a different patient is named.` : '- No patient selected.'}

CORE DUTIES:
- Documentation: Record vitals (BP, Heart Rate, Temp, etc.).
- Retrieval: Summarize history, vitals, encounters, and procedures.
- Registry: Search for or register new patients.

VOICE & TONE:
- Be clinical, helpful, and extremely efficient. 
- Confirm every save operation with the exact value and resource ID.
- If you record something, say: "Successfully recorded [Measurement] as [Value] (ID: [ID])".`;

        const result = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            system: systemPrompt,
            messages: [{ role: 'user', content: message }],
            tools: {
                searchPatients: (tool as any)({
                    description: 'Search for patients by name',
                    parameters: z.object({
                        name: z.string().describe('Patient name to search for'),
                    }),
                    execute: async ({ name }: { name: string }) => {
                        try {
                            const result = await client.getPatients({ name, _count: 10 });
                            return { success: true, patients: result.patients };
                        } catch (error) {
                            return { success: false, error: String(error) };
                        }
                    },
                }),

                createPatient: (tool as any)({
                    description: 'Create a new patient',
                    parameters: z.object({
                        givenName: z.string().describe('Patient first name'),
                        familyName: z.string().describe('Patient last name'),
                        gender: z.enum(['male', 'female', 'other', 'unknown']).describe('Patient gender'),
                        birthDate: z.string().describe('Birth date in YYYY-MM-DD format'),
                    }),
                    execute: async ({ givenName, familyName, gender, birthDate }: { givenName: string, familyName: string, gender: 'male' | 'female' | 'other' | 'unknown', birthDate: string }) => {
                        try {
                            const patientData = FHIRClient.buildPatient(givenName, familyName, gender, birthDate);
                            const newPatient = await client.createPatient(patientData);
                            actions.push({
                                type: 'create',
                                resourceType: 'Patient',
                                resourceId: newPatient.id,
                                success: true,
                            });
                            return { success: true, patient: newPatient };
                        } catch (error) {
                            actions.push({ type: 'create', resourceType: 'Patient', success: false });
                            return { success: false, error: String(error) };
                        }
                    },
                }),

                createBloodPressure: (tool as any)({
                    description: 'Create a blood pressure observation for a patient',
                    parameters: z.object({
                        patientId: z.string().optional().describe('Patient ID (optional if in context)'),
                        systolic: z.number().describe('Systolic blood pressure in mmHg'),
                        diastolic: z.number().describe('Diastolic blood pressure in mmHg'),
                        dateTime: z.string().optional().describe('Measurement date (ISO format)'),
                    }),
                    execute: async ({ patientId, systolic, diastolic, dateTime }: { patientId?: string, systolic: number, diastolic: number, dateTime?: string }) => {
                        try {
                            const targetPatient = patientId || contextPatientId;
                            if (!targetPatient) {
                                return { success: false, error: 'No patient specified' };
                            }
                            const obsData = FHIRClient.buildBloodPressureObservation(targetPatient, systolic, diastolic, dateTime);
                            const newObs = await client.createObservation(obsData);
                            actions.push({
                                type: 'create',
                                resourceType: 'Observation',
                                resourceId: newObs.id,
                                success: true,
                            });
                            return { success: true, observation: newObs };
                        } catch (error) {
                            actions.push({ type: 'create', resourceType: 'Observation', success: false });
                            return { success: false, error: String(error) };
                        }
                    },
                }),

                createHeartRate: (tool as any)({
                    description: 'Create a heart rate observation for a patient',
                    parameters: z.object({
                        patientId: z.string().optional().describe('Patient ID'),
                        heartRate: z.number().describe('Heart rate value in bpm'),
                        dateTime: z.string().optional().describe('ISO timestamp'),
                    }),
                    execute: async ({ patientId, heartRate, dateTime }: { patientId?: string, heartRate: number, dateTime?: string }) => {
                        try {
                            const targetPatient = patientId || contextPatientId;
                            if (!targetPatient) return { success: false, error: 'No patient selected' };
                            const obsData = FHIRClient.buildHeartRateObservation(targetPatient, heartRate, dateTime);
                            const newObs = await client.createObservation(obsData);
                            actions.push({ type: 'create', resourceType: 'Observation', resourceId: newObs.id, success: true });
                            return { success: true, observation: newObs };
                        } catch (error) {
                            actions.push({ type: 'create', resourceType: 'Observation', success: false });
                            return { success: false, error: String(error) };
                        }
                    },
                }),

                createObservation: (tool as any)({
                    description: 'Create a generic vital sign or observation (weight, pulse ox, etc.)',
                    parameters: z.object({
                        patientId: z.string().optional().describe('Patient ID'),
                        type: z.string().describe('Type of observation (e.g. weight, temperature, pulse-ox)'),
                        value: z.number().describe('Numeric value of the observation'),
                        unit: z.string().describe('Unit of measurement (e.g. kg, C, %)'),
                        code: z.string().describe('LOINC code for the observation (e.g. 29463-7 for weight)'),
                    }),
                    execute: async ({ patientId, type, value, unit, code }: { patientId?: string, type: string, value: number, unit: string, code: string }) => {
                        try {
                            const targetPatient = patientId || contextPatientId;
                            if (!targetPatient) return { success: false, error: 'No patient selected' };

                            const observation: any = {
                                resourceType: 'Observation',
                                status: 'final',
                                category: [{
                                    coding: [{
                                        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                                        code: 'vital-signs',
                                        display: 'Vital Signs'
                                    }]
                                }],
                                code: {
                                    coding: [{
                                        system: 'http://loinc.org',
                                        code: code,
                                        display: type
                                    }]
                                },
                                subject: { reference: `Patient/${targetPatient}` },
                                effectiveDateTime: new Date().toISOString(),
                                valueQuantity: {
                                    value: value,
                                    unit: unit,
                                    system: 'http://unitsofmeasure.org',
                                }
                            };

                            const newObs = await client.createObservation(observation);
                            actions.push({ type: 'create', resourceType: 'Observation', resourceId: newObs.id, success: true });
                            return { success: true, observation: newObs };
                        } catch (error) {
                            actions.push({ type: 'create', resourceType: 'Observation', success: false });
                            return { success: false, error: String(error) };
                        }
                    },
                }),

                getPatientVitals: (tool as any)({
                    description: 'Get vital signs for a patient',
                    parameters: z.object({
                        patientId: z.string().optional().describe('Patient ID'),
                    }),
                    execute: async ({ patientId }: { patientId?: string }) => {
                        try {
                            const targetPatient = patientId || contextPatientId;
                            if (!targetPatient) {
                                return { success: false, error: 'No patient specified' };
                            }
                            const vitals = await client.getObservations(targetPatient, 'vital-signs');
                            return { success: true, vitals: vitals.resources };
                        } catch (error) {
                            return { success: false, error: String(error) };
                        }
                    },
                }),

                getPatientEncounters: (tool as any)({
                    description: 'Get encounters (visits) for a patient',
                    parameters: z.object({
                        patientId: z.string().optional().describe('Patient ID'),
                    }),
                    execute: async ({ patientId }: { patientId?: string }) => {
                        try {
                            const targetPatient = patientId || contextPatientId;
                            if (!targetPatient) {
                                return { success: false, error: 'No patient specified' };
                            }
                            const encounters = await client.getEncounters(targetPatient);
                            return { success: true, encounters: encounters.resources };
                        } catch (error) {
                            return { success: false, error: String(error) };
                        }
                    },
                }),

                getPatientProcedures: (tool as any)({
                    description: 'Get procedures performed on a patient',
                    parameters: z.object({
                        patientId: z.string().optional().describe('Patient ID'),
                    }),
                    execute: async (args: { patientId?: string }) => {
                        try {
                            const targetPatient = args.patientId || contextPatientId;
                            if (!targetPatient) return { success: false, error: 'No patient specified' };
                            const procedures = await client.getProcedures(targetPatient);
                            return { success: true, procedures: procedures.resources };
                        } catch (error) {
                            return { success: false, error: String(error) };
                        }
                    },
                }),

                getPatientConditions: (tool as any)({
                    description: 'Get medical conditions for a patient',
                    parameters: z.object({
                        patientId: z.string().optional().describe('Patient ID'),
                    }),
                    execute: async (args: { patientId?: string }) => {
                        try {
                            const targetPatient = args.patientId || contextPatientId;
                            if (!targetPatient) return { success: false, error: 'No patient specified' };
                            const conditions = await client.getConditions(targetPatient);
                            return { success: true, conditions: conditions.resources };
                        } catch (error) {
                            return { success: false, error: String(error) };
                        }
                    },
                }),

                createCondition: (tool as any)({
                    description: 'Record a new diagnosis or clinical condition',
                    parameters: z.object({
                        patientId: z.string().optional(),
                        display: z.string().describe('Name of the condition (e.g. Hypertension)'),
                        code: z.string().optional().describe('ICD-10 or SNOMED code'),
                        status: z.enum(['active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved']).optional(),
                    }),
                    execute: async ({ patientId, display, code, status }: { patientId?: string, display: string, code?: string, status?: any }) => {
                        try {
                            const targetPatient = patientId || contextPatientId;
                            if (!targetPatient) return { success: false, error: 'No patient' };
                            const condition: Partial<FHIRCondition> = {
                                resourceType: 'Condition',
                                clinicalStatus: {
                                    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: status || 'active' }]
                                },
                                code: {
                                    coding: [{ system: 'http://snomed.info/sct', code: code || 'unknown', display: display }]
                                },
                                subject: { reference: `Patient/${targetPatient}` },
                                onsetDateTime: new Date().toISOString()
                            };
                            const response = await client.createCondition(condition);
                            actions.push({ type: 'create', resourceType: 'Condition', resourceId: response.id, success: true });
                            return { success: true, condition: response };
                        } catch (error) {
                            return { success: false, error: String(error) };
                        }
                    },
                }),
            },
        });

        return NextResponse.json({
            response: result.text,
            actions,
        });
    } catch (error) {
        console.error('Agent error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Agent processing failed' },
            { status: 500 }
        );
    }
}
