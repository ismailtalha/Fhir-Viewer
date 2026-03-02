import { NextRequest, NextResponse } from 'next/server';
import { FHIRClient } from '@/lib/fhir-client';
import { getConnection } from '@/lib/session';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await req.json();
        const { locationId, locationName } = body;

        if (!locationId || !locationName) {
            return NextResponse.json({ error: 'Missing locationId or locationName' }, { status: 400 });
        }

        const connection = await getConnection();
        if (!connection) {
            return NextResponse.json({ error: 'No FHIR connection found' }, { status: 401 });
        }

        const client = new FHIRClient(connection);
        const result = await client.updatePatientLocation(params.id, locationId, locationName);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Location Assignment Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
