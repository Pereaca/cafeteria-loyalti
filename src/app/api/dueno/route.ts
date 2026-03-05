import { NextResponse } from 'next/server';
import { getPedidos, getClientes } from '@/lib/sheets';

export async function GET() {
    try {
        const [todosLosPedidos, clientes] = await Promise.all([
            getPedidos(false), // todos, incluyendo Listo
            getClientes(),
        ]);

        const hoy = new Date().toLocaleDateString('es-MX');

        // ── Pedidos de hoy ──────────────────────────────────────────
        const pedidosHoy = todosLosPedidos.filter(p => p.fecha === hoy && p.estado === 'Listo');
        const ingresosHoy = pedidosHoy.reduce((s, p) => s + p.totalEstimado, 0);
        const pedidosActivos = todosLosPedidos.filter(p => p.estado === 'Enviado' || p.estado === 'Preparando').length;

        // ── Tiempos promedio ────────────────────────────────────────
        const conTiempos = todosLosPedidos.filter(p => p.minPreparacion > 0 && p.minPreparacion < 60);
        const avgPrep = conTiempos.length
            ? (conTiempos.reduce((s, p) => s + p.minPreparacion, 0) / conTiempos.length).toFixed(1)
            : '—';
        const avgTotal = conTiempos.length
            ? (conTiempos.reduce((s, p) => s + p.minTotal, 0) / conTiempos.length).toFixed(1)
            : '—';

        // ── Clientes por nivel ──────────────────────────────────────
        const topClientes = clientes.filter(c => c.nivel === 'TOP');
        const medioClientes = clientes.filter(c => c.nivel === 'MEDIO');

        // TOP clientes ordenados por total gastado
        const topClientesLista = clientes
            .filter(c => c.nivel === 'TOP' || c.nivel === 'MEDIO')
            .sort((a, b) => b.totalGastado - a.totalGastado)
            .slice(0, 10);

        // ── Productos más vendidos ──────────────────────────────────
        const conteo: Record<string, number> = {};
        todosLosPedidos
            .filter(p => p.estado === 'Listo')
            .forEach(p => {
                p.productos.split(',').forEach(prod => {
                    const nombre = prod.replace(/^\d+x\s*/, '').trim();
                    conteo[nombre] = (conteo[nombre] || 0) + 1;
                });
            });
        const productosTop = Object.entries(conteo)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([nombre, count]) => ({ nombre, count }));

        // ── Pedidos recientes completados ───────────────────────────
        const recientes = todosLosPedidos
            .filter(p => p.estado === 'Listo')
            .slice(-8)
            .reverse();

        // ── Ingresos por día (últimos 7 días) ───────────────────────
        const ingRecentDays: Record<string, number> = {};
        todosLosPedidos
            .filter(p => p.estado === 'Listo')
            .forEach(p => {
                if (p.fecha) {
                    ingRecentDays[p.fecha] = (ingRecentDays[p.fecha] || 0) + p.totalEstimado;
                }
            });

        return NextResponse.json({
            stats: {
                pedidosHoy: pedidosHoy.length,
                ingresosHoy,
                pedidosActivos,
                totalClientes: clientes.length,
                topClientes: topClientes.length,
                medioClientes: medioClientes.length,
                avgPrep,
                avgTotal,
            },
            topClientesLista,
            productosTop,
            recientes,
            ingRecentDays,
        });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
