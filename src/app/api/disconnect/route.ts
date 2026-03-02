import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';

export async function POST(): Promise<NextResponse> {
    try {
        await clearSession();
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
