import { NextRequest, NextResponse } from 'next/server';
import { FHIRClient } from '@/lib/fhir-client';
import { getConnection } from '@/lib/session';
import { SimplePatient, FHIREncounter } from '@/types/fhir';

export const runtime = 'edge';

export async function GET(request: NextRequest): Promise<NextResponse<{ patients: SimplePatient[], nextOffset?: string } | { error: string }>> {
    try {
        const connection = await getConnection();

        if (!connection) {
            return NextResponse.json({ error: 'Not connected to a FHIR server' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const name = searchParams.get('name') || undefined;
        const count = parseInt(searchParams.get('_count') || '20');
        const offset = searchParams.get('_getpagesoffset') || undefined;

        const client = new FHIRClient(connection);
        const result = await client.getPatients({
            name,
            _count: count,
            _getpagesoffset: offset
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching patients:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch patients' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const connection = await getConnection();
        if (!connection) {
            return NextResponse.json({ error: 'Not connected to a FHIR server' }, { status: 401 });
        }

        const body = await request.json();
        const client = new FHIRClient(connection);

        // 1. Create Patient
        const patientData = FHIRClient.buildPatient(
            body.givenName,
            body.familyName,
            body.gender,
            body.birthDate,
            {
                phone: body.phone,
                email: body.email,
                address: body.address,
                mrn: body.mrn
            }
        );

        const newPatient = await client.createPatient(patientData);
        
        if (!newPatient.id) {
            throw new Error('Failed to create patient: No ID returned');
        }

        // 2. Create Encounter
        const encounterType = body.encounterType || 'ambulatory';
        const typeDisplay = encounterType === 'ambulatory' ? 'Ambulatory Visit' :
            encounterType === 'emergency' ? 'Emergency Visit' : 'Inpatient Stay';
            
        const encounterData: Partial<FHIREncounter> = {
            status: 'in-progress',
            class: {
                code: encounterType === 'ambulatory' ? 'AMB' :
                      encounterType === 'emergency' ? 'EMER' : 'IMP',
                display: typeDisplay,
            },
            type: [{
                coding: [{
                    system: 'http://snomed.info/sct',
                    code: encounterType === 'ambulatory' ? '308335008' :
                          encounterType === 'emergency' ? '50849002' : '32485007',
                    display: typeDisplay,
                }],
                text: typeDisplay,
            }],
            subject: { reference: `Patient/${newPatient.id}` },
            period: {
                start: new Date().toISOString(),
            },
        };

        if (body.encounterReason) {
            encounterData.reasonCode = [{
                text: body.encounterReason,
            }];
        }

        const newEncounter = await client.createEncounter(encounterData);

        return NextResponse.json({ success: true, patient: newPatient, encounter: newEncounter });

    } catch (error) {
        console.error('Error creating patient:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create patient' },
            { status: 500 }
        );
    }
}
