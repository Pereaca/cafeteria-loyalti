'use client';

import { useEffect, useState, useCallback } from 'react';

type Stats = {
    pedidosHoy: number;
    ingresosHoy: number;
    pedidosActivos: number;
    totalClientes: number;
    topClientes: number;
    medioClientes: number;
    avgPrep: string;
    avgTotal: string;
};

type ClienteTop = {
    nombre: string;
    telefono: string;
    nivel: string;
    visitas: number;
    totalGastado: number;
    puntos: number;
    signo: string;
};

type ProductoTop = { nombre: string; count: number };

type PedidoReciente = {
    id: string;
    nombre: string;
    nivel: string;
    productos: string;
    totalEstimado: number;
    minTotal: number;
    fecha: string;
};

type DashboardData = {
    stats: Stats;
    topClientesLista: ClienteTop[];
    productosTop: ProductoTop[];
    recientes: PedidoReciente[];
    ingRecentDays: Record<string, number>;
};

const NIVEL_BADGE: Record<string, string> = {
    TOP: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    MEDIO: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    BASE: 'bg-zinc-700 text-zinc-400',
};

const NIVEL_ICON: Record<string, string> = { TOP: '🏆', MEDIO: '⭐', BASE: '🔵' };

function StatCard({ emoji, label, value, sub, color = 'text-white' }: { emoji: string; label: string; value: string | number; sub?: string; color?: string }) {
    return (
        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl p-5 flex flex-col gap-1 backdrop-blur">
            <div className="text-2xl mb-1">{emoji}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-zinc-400">{label}</div>
            {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
        </div>
    );
}

export default function DuenoPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdate, setLastUpdate] = useState('');

    const fetchData = useCallback(async () => {
        try {
            // Pasar fecha de hoy desde el browser (timezone correcto del cliente)
            const today = new Date().toLocaleDateString('es-MX');
            const res = await fetch(`/api/dueno?today=${encodeURIComponent(today)}`);
            if (!res.ok) throw new Error('Error al cargar datos');
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setData(json);
            setLastUpdate(new Date().toLocaleTimeString('es-MX'));
            setError('');
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // refresh cada 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    // Calcular barra de progreso de productos
    const maxProducto = data?.productosTop[0]?.count || 1;

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
            <div className="text-center">
                <div className="text-4xl mb-4 animate-pulse">☕</div>
                <p className="text-zinc-400 text-sm">Cargando dashboard...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <div className="text-center text-red-400">
                <div className="text-3xl mb-2">⚠️</div>
                <p className="text-sm">{error}</p>
                <button className="mt-4 px-4 py-2 bg-zinc-800 rounded-lg text-white text-sm" onClick={fetchData}>Reintentar</button>
            </div>
        </div>
    );

    if (!data) return null;

    const { stats, topClientesLista, productosTop, recientes, ingRecentDays } = data;

    // Últimos 7 días para mini gráfica
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toLocaleDateString('es-MX'));
    }
    const maxIng = Math.max(...days.map(d => ingRecentDays[d] || 0), 1);

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📊</span>
                        <div>
                            <h1 className="font-bold text-white">Dashboard</h1>
                            <p className="text-xs text-zinc-500">Panel del Dueño</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">Actualizado: {lastUpdate}</span>
                        <button onClick={fetchData}
                            className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                            🔄 Actualizar
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">

                {/* Stats Grid */}
                <div>
                    <h2 className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-4">Resumen de hoy</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard emoji="🧾" label="Pedidos hoy" value={stats.pedidosHoy} color="text-amber-400" />
                        <StatCard emoji="💰" label="Ingresos hoy" value={`$${stats.ingresosHoy.toFixed(0)}`} color="text-green-400" />
                        <StatCard emoji="⏱️" label="T. prep. promedio" value={`${stats.avgPrep} min`} color="text-blue-400" sub={`Total: ${stats.avgTotal} min`} />
                        <StatCard emoji="🔥" label="En espera ahora" value={stats.pedidosActivos} color={stats.pedidosActivos > 3 ? 'text-red-400' : 'text-zinc-300'} />
                    </div>
                </div>

                {/* Clientes stats */}
                <div>
                    <h2 className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-4">Base de clientes</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <StatCard emoji="👥" label="Total clientes" value={stats.totalClientes} />
                        <StatCard emoji="🏆" label="Clientes TOP" value={stats.topClientes} color="text-amber-400" />
                        <StatCard emoji="⭐" label="Clientes MEDIO" value={stats.medioClientes} color="text-blue-400" />
                    </div>
                </div>

                {/* Gráfica de ingresos  */}
                <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl p-6 backdrop-blur">
                    <h2 className="text-sm font-bold mb-5">Ingresos últimos 7 días</h2>
                    <div className="flex items-end gap-2 h-28">
                        {days.map(d => {
                            const val = ingRecentDays[d] || 0;
                            const pct = Math.max((val / maxIng) * 100, val > 0 ? 8 : 2);
                            const isToday = d === days[days.length - 1];
                            return (
                                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-xs text-zinc-500 leading-none">{val > 0 ? `$${val}` : ''}</span>
                                    <div className="w-full rounded-t-md transition-all duration-500"
                                        style={{ height: `${pct}%`, background: isToday ? 'rgb(245 158 11)' : 'rgb(63 63 70)' }} />
                                    <span className={`text-[10px] ${isToday ? 'text-amber-400 font-bold' : 'text-zinc-600'}`}>
                                        {d.split('/').slice(0, 2).join('/')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Two columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Productos más vendidos */}
                    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl p-6 backdrop-blur">
                        <h2 className="text-sm font-bold mb-5">🥇 Productos más vendidos</h2>
                        {productosTop.length === 0 ? (
                            <p className="text-zinc-500 text-sm">Sin datos aún</p>
                        ) : (
                            <div className="space-y-4">
                                {productosTop.map((p, i) => (
                                    <div key={p.nombre}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-zinc-200">{i + 1}. {p.nombre}</span>
                                            <span className="text-zinc-400 font-mono">{p.count}x</span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500 rounded-full transition-all duration-700"
                                                style={{ width: `${(p.count / maxProducto) * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pedidos recientes */}
                    <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl p-6 backdrop-blur">
                        <h2 className="text-sm font-bold mb-5">📋 Pedidos recientes</h2>
                        {recientes.length === 0 ? (
                            <p className="text-zinc-500 text-sm">Sin pedidos completados aún</p>
                        ) : (
                            <div className="space-y-3">
                                {recientes.map(p => (
                                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-zinc-700/50 last:border-0">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${NIVEL_BADGE[p.nivel]}`}>
                                                    {NIVEL_ICON[p.nivel]}
                                                </span>
                                                <span className="text-sm font-medium truncate">{p.nombre.split(' ')[0]}</span>
                                            </div>
                                            <p className="text-xs text-zinc-500 truncate mt-0.5">{p.productos}</p>
                                        </div>
                                        <div className="text-right ml-3 flex-shrink-0">
                                            <div className="text-sm font-bold text-green-400">${p.totalEstimado}</div>
                                            {p.minTotal > 0 && (
                                                <div className="text-xs text-zinc-500">{p.minTotal} min</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* TOP Clientes tabla */}
                <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl p-6 backdrop-blur">
                    <h2 className="text-sm font-bold mb-5">👑 Mejores clientes</h2>
                    {topClientesLista.length === 0 ? (
                        <p className="text-zinc-500 text-sm">Aún no hay clientes TOP o MEDIO</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-zinc-500 border-b border-zinc-700">
                                        <th className="text-left py-2 pr-4">Cliente</th>
                                        <th className="text-center py-2 pr-4">Nivel</th>
                                        <th className="text-center py-2 pr-4">Visitas</th>
                                        <th className="text-right py-2 pr-4">Total gastado</th>
                                        <th className="text-right py-2">Puntos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topClientesLista.map(c => (
                                        <tr key={c.telefono} className="border-b border-zinc-800 hover:bg-zinc-700/20 transition-colors">
                                            <td className="py-3 pr-4">
                                                <div className="font-medium">{c.nombre}</div>
                                                <div className="text-xs text-zinc-500">{c.signo}</div>
                                            </td>
                                            <td className="py-3 pr-4 text-center">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${NIVEL_BADGE[c.nivel]}`}>
                                                    {NIVEL_ICON[c.nivel]} {c.nivel}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-center text-zinc-300">{c.visitas}</td>
                                            <td className="py-3 pr-4 text-right text-green-400 font-mono">${c.totalGastado}</td>
                                            <td className="py-3 text-right text-amber-400 font-mono">{c.puntos}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
