import { NextResponse } from 'next/server';
import { getMenu } from '@/lib/sheets';

export async function GET() {
    try {
        const menu = await getMenu();
        return NextResponse.json({ menu });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
