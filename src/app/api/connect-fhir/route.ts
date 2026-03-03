import { NextRequest, NextResponse } from 'next/server';
import { FHIRClient } from '@/lib/fhir-client';
import { saveConnection } from '@/lib/session';
import { FHIRConnection, ConnectResponse } from '@/types/fhir';

export const runtime = 'edge';

export async function POST(request: NextRequest): Promise<NextResponse<ConnectResponse>> {
    try {
        const body = await request.json();
        const { baseUrl, authType, token, username, password } = body;

        // Validate required fields
        if (!baseUrl) {
            return NextResponse.json({
                success: false,
                error: 'FHIR base URL is required',
            }, { status: 400 });
        }

        // Validate URL format
        try {
            new URL(baseUrl);
        } catch {
            return NextResponse.json({
                success: false,
                error: 'Invalid URL format',
            }, { status: 400 });
        }

        // Build connection object
        const connection: FHIRConnection = {
            baseUrl,
            authType: authType || 'none',
            token,
            username,
            password,
        };

        // Test connection by fetching metadata
        const client = new FHIRClient(connection);
        const result = await client.testConnection();

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: 'Could not connect to FHIR server. Please check the URL and credentials.',
            }, { status: 400 });
        }

        // Save connection to session
        await saveConnection(connection);

        return NextResponse.json({
            success: true,
            serverName: result.serverName,
            fhirVersion: result.fhirVersion,
        });
    } catch (error) {
        console.error('Connection error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to connect to FHIR server',
        }, { status: 500 });
    }
}
