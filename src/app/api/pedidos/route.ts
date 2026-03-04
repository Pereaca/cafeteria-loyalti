import { NextResponse } from 'next/server';
import { getPedidos, crearPedido, actualizarEstadoPedido } from '@/lib/sheets';

export async function GET() {
    try {
        const pedidos = await getPedidos(true);
        return NextResponse.json({ pedidos });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { nombre, telefono, nivel, productos, totalEstimado, notas } = body;
        const id = `P${Date.now()}-${telefono.slice(-4)}`;
        const fecha = new Date().toLocaleDateString('es-MX');
        await crearPedido({ id, nombre, telefono, nivel, productos, totalEstimado, estado: 'Enviado', tEnviado: '', tPreparando: '', tListo: '', minEspera: 0, minPreparacion: 0, minTotal: 0, notas, fecha });
        return NextResponse.json({ ok: true, id });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { fila, estado } = await req.json();
        await actualizarEstadoPedido(fila, estado);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
