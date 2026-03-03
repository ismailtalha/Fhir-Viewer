import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { FHIRClient } from '@/lib/fhir-client';
import { FHIRObservation, FHIRCondition, FHIRProcedure, FHIREncounter } from '@/types/fhir';

export const runtime = 'edge';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();

        if (!session.fhirConnection) {
            return NextResponse.json({ error: 'Not connected to FHIR server' }, { status: 401 });
        }

        const patientId = params.id;
        const body = await request.json();
        const { resourceType, data } = body;

        if (!resourceType || !data) {
            return NextResponse.json({ error: 'resourceType and data are required' }, { status: 400 });
        }

        const client = new FHIRClient(session.fhirConnection);

        let result: FHIRObservation | FHIRCondition | FHIRProcedure | FHIREncounter;

        switch (resourceType) {
            case 'Observation':
                result = await client.createObservation(buildObservation(patientId, data));
                break;

            case 'Condition':
                result = await client.createCondition(buildCondition(patientId, data));
                break;

            case 'Procedure':
                result = await client.createProcedure(buildProcedure(patientId, data));
                break;

            case 'Encounter':
                result = await client.createEncounter(buildEncounter(patientId, data));
                break;

            default:
                return NextResponse.json({ error: `Unsupported resource type: ${resourceType}` }, { status: 400 });
        }

        return NextResponse.json({ success: true, resource: result });

    } catch (error) {
        console.error('Error creating resource:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create resource' },
            { status: 500 }
        );
    }
}

function buildObservation(patientId: string, data: {
    category: 'vital-signs' | 'laboratory' | 'other';
    display: string;
    code?: string;
    value: string;
    unit?: string;
    effectiveDateTime: string;
    encounterId?: string;
}): Partial<FHIRObservation> {
    const categoryDisplay = data.category === 'vital-signs' ? 'Vital Signs' :
        data.category === 'laboratory' ? 'Laboratory' : 'Other';

    return {
        status: 'final',
        category: [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: data.category,
                display: categoryDisplay,
            }],
        }],
        code: {
            coding: data.code ? [{
                system: 'http://loinc.org',
                code: data.code,
                display: data.display,
            }] : undefined,
            text: data.display,
        },
        subject: { reference: `Patient/${patientId}` },
        ...(data.encounterId ? { encounter: { reference: `Encounter/${data.encounterId}` } } : {}),
        effectiveDateTime: data.effectiveDateTime,
        valueString: data.value,
        ...(data.unit && !isNaN(Number(data.value)) ? {
            valueQuantity: {
                value: Number(data.value),
                unit: data.unit,
                system: 'http://unitsofmeasure.org',
            },
            valueString: undefined,
        } : {}),
    };
}

function buildCondition(patientId: string, data: {
    display: string;
    code?: string;
    clinicalStatus: 'active' | 'resolved' | 'inactive';
    severity?: 'mild' | 'moderate' | 'severe';
    onsetDateTime: string;
    encounterId?: string;
}): Partial<FHIRCondition> {
    return {
        clinicalStatus: {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: data.clinicalStatus,
                display: data.clinicalStatus.charAt(0).toUpperCase() + data.clinicalStatus.slice(1),
            }],
        },
        verificationStatus: {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                code: 'confirmed',
                display: 'Confirmed',
            }],
        },
        code: {
            coding: data.code ? [{
                system: 'http://snomed.info/sct',
                code: data.code,
                display: data.display,
            }] : undefined,
            text: data.display,
        },
        subject: { reference: `Patient/${patientId}` },
        ...(data.encounterId ? { encounter: { reference: `Encounter/${data.encounterId}` } } : {}),
        onsetDateTime: data.onsetDateTime,
        ...(data.severity ? {
            severity: {
                coding: [{
                    system: 'http://snomed.info/sct',
                    code: data.severity === 'mild' ? '255604002' :
                        data.severity === 'moderate' ? '6736007' : '24484000',
                    display: data.severity.charAt(0).toUpperCase() + data.severity.slice(1),
                }],
                text: data.severity.charAt(0).toUpperCase() + data.severity.slice(1),
            },
        } : {}),
    };
}

function buildProcedure(patientId: string, data: {
    display: string;
    code?: string;
    status: 'completed' | 'in-progress' | 'not-done';
    performedDateTime: string;
    encounterId?: string;
}): Partial<FHIRProcedure> {
    return {
        status: data.status,
        code: {
            coding: data.code ? [{
                system: 'http://snomed.info/sct',
                code: data.code,
                display: data.display,
            }] : undefined,
            text: data.display,
        },
        subject: { reference: `Patient/${patientId}` },
        ...(data.encounterId ? { encounter: { reference: `Encounter/${data.encounterId}` } } : {}),
        performedDateTime: data.performedDateTime,
    };
}

function buildEncounter(patientId: string, data: {
    type: 'ambulatory' | 'emergency' | 'inpatient';
    status: 'finished' | 'in-progress' | 'planned';
    reason: string;
    start: string;
    end?: string;
}): Partial<FHIREncounter> {
    const typeDisplay = data.type === 'ambulatory' ? 'Ambulatory Visit' :
        data.type === 'emergency' ? 'Emergency Visit' : 'Inpatient Stay';

    return {
        status: data.status,
        class: {
            code: data.type === 'ambulatory' ? 'AMB' :
                data.type === 'emergency' ? 'EMER' : 'IMP',
            display: typeDisplay,
        },
        type: [{
            coding: [{
                system: 'http://snomed.info/sct',
                code: data.type === 'ambulatory' ? '308335008' :
                    data.type === 'emergency' ? '50849002' : '32485007',
                display: typeDisplay,
            }],
            text: typeDisplay,
        }],
        subject: { reference: `Patient/${patientId}` },
        period: {
            start: data.start,
            ...(data.end ? { end: data.end } : {}),
        },
        reasonCode: [{
            text: data.reason,
        }],
    };
}
