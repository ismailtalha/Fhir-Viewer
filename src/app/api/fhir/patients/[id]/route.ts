import { NextRequest, NextResponse } from 'next/server';
import { FHIRClient } from '@/lib/fhir-client';
import { getConnection } from '@/lib/session';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const connection = await getConnection();
        if (!connection) {
            return NextResponse.json({ error: 'Not connected to a FHIR server' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const client = new FHIRClient(connection);

        const results: any = {};

        // 1. Update Patient resource if demographics changed
        if (body.patientUpdate) {
            results.patient = await client.updatePatient(id, body.patientUpdate);
        }

        // 2. Update Code Status if changed
        if (body.codeStatus) {
            results.codeStatus = await client.updateCodeStatus(id, body.codeStatus);
        }

        // 3. Admission diagnosis is complex, typically handled via latest Encounter 
        // or a Condition. We'll skip for now if not explicitly mapping to a resource.

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error('Error updating patient:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update patient data' },
            { status: 500 }
        );
    }
}
