import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { FHIRConnection } from '@/types/fhir';

export interface SessionData {
    fhirConnection?: FHIRConnection;
    isConnected?: boolean;
}

const sessionOptions = {
    password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
    cookieName: 'fhir-ai-session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax' as const,
    },
};

export async function getSession(): Promise<IronSession<SessionData>> {
    const cookieStore = await cookies();
    return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function saveConnection(connection: FHIRConnection): Promise<void> {
    const session = await getSession();
    session.fhirConnection = connection;
    session.isConnected = true;
    await session.save();
}

export async function getConnection(): Promise<FHIRConnection | null> {
    const session = await getSession();
    return session.fhirConnection || null;
}

export async function isConnected(): Promise<boolean> {
    const session = await getSession();
    return session.isConnected || false;
}

export async function clearSession(): Promise<void> {
    const session = await getSession();
    session.destroy();
}
