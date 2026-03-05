import { NextResponse } from 'next/server';

// In-memory OTP store: telefono → { code, expiresAt }
const otpStore = new Map<string, { code: string; expiresAt: number }>();

// Cleanup expired entries periodically
function cleanup() {
    const now = Date.now();
    for (const [tel, v] of otpStore.entries()) {
        if (v.expiresAt < now) otpStore.delete(tel);
    }
}

function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendWhatsApp(telefono: string, code: string): Promise<boolean> {
    const evolUrl = process.env.EVOLUTION_URL || 'https://evolutionapi-evolution-api.ibbvsq.easypanel.host';
    const instance = process.env.EVOLUTION_INSTANCE || 'Consubanco';
    const apiKey = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';

    const numero = `52${telefono.replace(/\D/g, '').slice(-10)}`;
    const mensaje = `☕ *Ébano Café*\n\nTu código de verificación es:\n\n*${code}*\n\n🔐 Válido por 10 minutos.\nNo lo compartas con nadie.`;

    try {
        const res = await fetch(`${evolUrl}/message/sendText/${instance}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
            },
            body: JSON.stringify({
                number: `${numero}@s.whatsapp.net`,
                text: mensaje,
            }),
        });
        const data = await res.json();
        return res.ok && (data.key?.id || data.status !== 'error');
    } catch {
        return false;
    }
}

// POST /api/otp — { action: 'send' | 'verify', telefono, code? }
export async function POST(req: Request) {
    cleanup();
    try {
        const { action, telefono, code } = await req.json();
        const tel = (telefono || '').replace(/\D/g, '').slice(-10);

        if (!tel || tel.length < 10) {
            return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 });
        }

        if (action === 'send') {
            const newCode = generateCode();
            const sent = await sendWhatsApp(tel, newCode);

            if (!sent) {
                return NextResponse.json({ error: 'No se pudo enviar el WhatsApp. Verifica tu número.' }, { status: 500 });
            }

            // Store with 10 min TTL
            otpStore.set(tel, { code: newCode, expiresAt: Date.now() + 10 * 60 * 1000 });
            return NextResponse.json({ ok: true, message: 'Código enviado por WhatsApp' });
        }

        if (action === 'verify') {
            const stored = otpStore.get(tel);

            if (!stored) {
                return NextResponse.json({ error: 'Código expirado. Solicita uno nuevo.' }, { status: 400 });
            }
            if (Date.now() > stored.expiresAt) {
                otpStore.delete(tel);
                return NextResponse.json({ error: 'Código expirado. Solicita uno nuevo.' }, { status: 400 });
            }
            if (stored.code !== code) {
                return NextResponse.json({ error: 'Código incorrecto. Intenta de nuevo.' }, { status: 400 });
            }

            // Valid — delete so it can't be reused
            otpStore.delete(tel);
            return NextResponse.json({ ok: true, verified: true });
        }

        return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
