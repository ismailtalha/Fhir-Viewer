import { NextRequest, NextResponse } from 'next/server';
import { FHIRClient } from '@/lib/fhir-client';
import { getConnection } from '@/lib/session';

export async function GET() {
    try {
        const connection = await getConnection();
        if (!connection) {
            return NextResponse.json({ error: 'No FHIR connection found' }, { status: 401 });
        }

        const client = new FHIRClient(connection);
        const locations = await client.getLocations();
        return NextResponse.json(locations);
    } catch (error: any) {
        console.error('Fetch Locations Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
