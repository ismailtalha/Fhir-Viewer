
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/session';
import { createFHIRClient } from '@/lib/fhir-client';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const connection = await getConnection();

        if (!connection) {
            return NextResponse.json({ error: 'Not connected' }, { status: 401 });
        }

        const client = createFHIRClient(connection);
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const offset = searchParams.get('_getpagesoffset') || undefined;
        const category = searchParams.get('category') || undefined;
        const patientId = params.id;

        if (!type) {
            return NextResponse.json({ error: 'Resource type is required' }, { status: 400 });
        }

        let result;

        switch (type.toLowerCase()) {
            case 'condition':
                result = await client.getConditions(patientId, offset);
                break;
            case 'encounter':
                result = await client.getEncounters(patientId, offset);
                break;
            case 'procedure':
                result = await client.getProcedures(patientId, offset);
                break;
            case 'observation':
                result = await client.getObservations(patientId, category, offset);
                break;
            default:
                return NextResponse.json({ error: 'Invalid resource type' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching resources:', error);
        return NextResponse.json(
            { error: 'Failed to fetch resources' },
            { status: 500 }
        );
    }
}
