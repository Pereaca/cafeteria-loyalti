import { NextResponse } from 'next/server';
import { getPedidos, crearPedido, actualizarEstadoPedido, getClienteByTel } from '@/lib/sheets';

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

        const pedidoData = await actualizarEstadoPedido(fila, estado, fechaLocal);

        // ── Flujo 12 + Flujo 6: fire-and-forget webhooks al marcar Listo ────
        if (estado === 'Listo' && pedidoData?.telefono) {
            (async () => {
                try {
                    const cliente = await getClienteByTel(pedidoData.telefono!);
                    const payload = {
                        nombre: pedidoData.nombre || '',
                        telefono: pedidoData.telefono || '',
                        signo: cliente?.signo || 'Géminis',
                        nivel: cliente?.nivel || pedidoData.nivel || 'BASE',
                        puntos: cliente?.puntos || 0,
                        productos: pedidoData.productos || '',
                    };
                    // Flujo 12: horóscopo personalizado
                    const webhookHoroscopo = process.env.WEBHOOK_PEDIDO_LISTO;
                    if (webhookHoroscopo) {
                        await fetch(webhookHoroscopo, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                        });
                    }
                    // Flujo 6: bienvenida solo en el PRIMER pedido completado (visitas ≤ 1)
                    const webhookBienvenida = process.env.WEBHOOK_BIENVENIDA;
                    const esNuevo = (cliente?.visitas ?? 0) <= 1;
                    if (webhookBienvenida && esNuevo) {
                        await fetch(webhookBienvenida, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                        });
                    }
                } catch (err) {
                    console.error('[Webhooks] Error:', err);
                }
            })();
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
