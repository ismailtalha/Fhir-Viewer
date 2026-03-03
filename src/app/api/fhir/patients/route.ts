import { NextRequest, NextResponse } from 'next/server';
import { FHIRClient } from '@/lib/fhir-client';
import { getConnection } from '@/lib/session';
import { SimplePatient } from '@/types/fhir';

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
