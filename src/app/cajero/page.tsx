'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Pedido = {
    id: string;
    nombre: string;
    telefono: string;
    nivel: string;
    productos: string;
    totalEstimado: number;
    estado: 'Enviado' | 'Preparando' | 'Listo';
    tEnviado: string;
    notas: string;
    fila: number;
};

const NIVEL_COLOR: Record<string, string> = {
    TOP: 'bg-amber-500 text-black',
    MEDIO: 'bg-blue-500 text-white',
    BASE: 'bg-zinc-600 text-white',
};

const NIVEL_EMOJI: Record<string, string> = {
    TOP: '🏆',
    MEDIO: '⭐',
    BASE: '🔵',
};

function minutosDesde(isoStr: string): string {
    if (!isoStr) return '0';
    const diff = (Date.now() - new Date(isoStr).getTime()) / 60000;
    return diff.toFixed(0);
}

export default function CajeroPage() {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [cargando, setCargando] = useState(true);
    const [actualizando, setActualizando] = useState<string | null>(null);
    const [hora, setHora] = useState('');

    const cargarPedidos = useCallback(async () => {
        try {
            const res = await fetch('/api/pedidos');
            const data = await res.json();
            setPedidos(data.pedidos || []);
        } catch (e) {
            console.error(e);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarPedidos();
        const interval = setInterval(cargarPedidos, 8000); // polling cada 8s
        return () => clearInterval(interval);
    }, [cargarPedidos]);

    useEffect(() => {
        const tick = () => setHora(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, []);

    async function cambiarEstado(fila: number, estado: 'Preparando' | 'Listo', id: string) {
        setActualizando(id);
        try {
            await fetch('/api/pedidos', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fila, estado }),
            });
            await cargarPedidos();
        } finally {
            setActualizando(null);
        }
    }

    const tops = pedidos.filter(p => p.nivel === 'TOP');
    const otros = pedidos.filter(p => p.nivel !== 'TOP');

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">🖥️ Cola de Pedidos</h1>
                    <p className="text-zinc-400 text-sm mt-0.5">Pantalla del cajero</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-amber-400">{hora}</div>
                    <div className="text-zinc-500 text-xs">{pedidos.length} pedidos activos</div>
                </div>
            </div>

            {cargando ? (
                <div className="flex items-center justify-center h-64 text-zinc-500">
                    <div className="text-center">
                        <div className="text-4xl mb-2 animate-pulse">☕</div>
                        <p>Cargando pedidos...</p>
                    </div>
                </div>
            ) : pedidos.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-zinc-500">
                    <div className="text-center">
                        <div className="text-5xl mb-3">✨</div>
                        <p className="text-lg">Sin pedidos pendientes</p>
                        <p className="text-sm mt-1">La cola está vacía</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* TOP clientes */}
                    {tops.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-amber-400 font-bold text-sm uppercase tracking-wider">🏆 Clientes TOP — Prioridad</span>
                                <div className="flex-1 h-px bg-amber-400/30" />
                            </div>
                            <div className="space-y-3">
                                {tops.map(p => <PedidoCard key={p.id} pedido={p} onAction={cambiarEstado} actualizando={actualizando} />)}
                            </div>
                        </div>
                    )}

                    {/* Cola general */}
                    {otros.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-zinc-400 font-bold text-sm uppercase tracking-wider">📋 Cola General</span>
                                <div className="flex-1 h-px bg-zinc-700" />
                            </div>
                            <div className="space-y-3">
                                {otros.map(p => <PedidoCard key={p.id} pedido={p} onAction={cambiarEstado} actualizando={actualizando} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function PedidoCard({ pedido, onAction, actualizando }: {
    pedido: Pedido;
    onAction: (fila: number, estado: 'Preparando' | 'Listo', id: string) => void;
    actualizando: string | null;
}) {
    const isLoading = actualizando === pedido.id;
    const mins = minutosDesde(pedido.tEnviado);
    const isUrgent = parseInt(mins) >= 5;

    return (
        <Card className={`p-4 border ${pedido.nivel === 'TOP' ? 'border-amber-500/50 bg-amber-950/20' : 'border-zinc-800 bg-zinc-900'}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    {/* Cliente y nivel */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-lg">{pedido.nombre}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${NIVEL_COLOR[pedido.nivel] || 'bg-zinc-600 text-white'}`}>
                            {NIVEL_EMOJI[pedido.nivel]} {pedido.nivel}
                        </span>
                        <Badge variant={pedido.estado === 'Preparando' ? 'default' : 'secondary'} className={pedido.estado === 'Preparando' ? 'bg-blue-600' : ''}>
                            {pedido.estado}
                        </Badge>
                    </div>

                    {/* Productos */}
                    <p className="text-zinc-300 text-sm mb-1">
                        ☕ {pedido.productos}
                    </p>

                    {/* Info fila */}
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mt-2">
                        <span className={isUrgent ? 'text-red-400 font-bold' : ''}>
                            ⏱ {mins} min en cola{isUrgent ? ' (!!)' : ''}
                        </span>
                        <span>💵 ${pedido.totalEstimado}</span>
                        {pedido.notas && <span>📝 {pedido.notas}</span>}
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2 shrink-0">
                    {pedido.estado === 'Enviado' && (
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={isLoading}
                            onClick={() => onAction(pedido.fila, 'Preparando', pedido.id)}
                        >
                            {isLoading ? '...' : '▶ Preparando'}
                        </Button>
                    )}
                    {pedido.estado === 'Preparando' && (
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={isLoading}
                            onClick={() => onAction(pedido.fila, 'Listo', pedido.id)}
                        >
                            {isLoading ? '...' : '✓ Listo'}
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
