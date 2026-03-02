
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
        const counts = await client.getPatientEverything(params.id);

        return NextResponse.json(counts);
    } catch (error) {
        console.error('Error in $everything:', error);
        return NextResponse.json(
            { error: 'Failed to fetch debug info', details: String(error) },
            { status: 500 }
        );
    }
}
