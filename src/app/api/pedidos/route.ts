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

        // ── Flujo 12: Enviar WhatsApp con horóscopo al marcar Listo ────
        if (estado === 'Listo' && pedidoData?.telefono) {
            const webhookUrl = process.env.WEBHOOK_PEDIDO_LISTO;
            if (webhookUrl) {
                // Buscar signo y puntos del cliente (async, no bloqueante)
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
                        await fetch(webhookUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                        });
                    } catch (err) {
                        console.error('[Flujo 12] Error llamando webhook:', err);
                    }
                })();
            }
        }

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
