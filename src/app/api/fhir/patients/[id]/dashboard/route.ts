import { NextRequest, NextResponse } from 'next/server';
import { FHIRClient } from '@/lib/fhir-client';
import { getConnection } from '@/lib/session';
import { PatientDashboard } from '@/types/fhir';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse<PatientDashboard | { error: string }>> {
    try {
        const connection = await getConnection();

        if (!connection) {
            return NextResponse.json({ error: 'Not connected to a FHIR server' }, { status: 401 });
        }

        const { id } = await params;
        const client = new FHIRClient(connection);
        const dashboard = await client.getPatientDashboard(id);

        return NextResponse.json(dashboard);
    } catch (error) {
        console.error('Error fetching patient dashboard:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch patient data' },
            { status: 500 }
        );
    }
}
