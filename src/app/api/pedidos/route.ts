import { NextResponse } from 'next/server';
import { getPedidos, crearPedido, actualizarEstadoPedido } from '@/lib/sheets';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const idBuscado = searchParams.get('id');

        if (idBuscado) {
            // Buscar pedido específico (incluyendo Listo) para seguimiento del cliente
            const todos = await getPedidos(false);
            const pedido = todos.find(p => p.id === idBuscado) || null;
            return NextResponse.json({ pedido });
        }

        const pedidos = await getPedidos(true);
        return NextResponse.json({ pedidos });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { nombre, telefono, nivel, productos, totalEstimado, notas, fecha: fechaCliente } = body;
        if (!nombre || !telefono) {
            return NextResponse.json({ error: 'nombre y telefono requeridos' }, { status: 400 });
        }
        const id = `P${Date.now()}-${telefono.slice(-4)}`;
        // Usar fecha del cliente (timezone correcto); fallback al servidor
        const fecha = fechaCliente || new Date().toLocaleDateString('es-MX');
        await crearPedido({ id, nombre, telefono, nivel, productos, totalEstimado, estado: 'Enviado', tEnviado: '', tPreparando: '', tListo: '', minEspera: 0, minPreparacion: 0, minTotal: 0, notas, fecha });
        return NextResponse.json({ ok: true, id });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { fila, estado, fechaLocal } = body;
        if (!fila || typeof fila !== 'number' || fila < 2) {
            return NextResponse.json({ error: 'fila inválida' }, { status: 400 });
        }
        if (estado !== 'Preparando' && estado !== 'Listo') {
            return NextResponse.json({ error: 'estado inválido' }, { status: 400 });
        }
        await actualizarEstadoPedido(fila, estado, fechaLocal);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
