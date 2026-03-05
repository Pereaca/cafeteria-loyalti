'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Cliente = {
    nombre: string;
    telefono: string;
    signo: string;
    bebidaFavorita: string;
    cumpleanos: string;
    visitas: number;
    ultimaVisita: string;
    totalGastado: number;
    puntos: number;
    nivel: 'TOP' | 'MEDIO' | 'BASE';
};

type Producto = { nombre: string; categoria: string; precio: number };
type Pedido = { id: string; estado: string; productos: string; tEnviado: string };

const NIVEL_COLORS: Record<string, string> = {
    TOP: 'bg-gradient-to-r from-amber-400 to-orange-500 text-black',
    MEDIO: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white',
    BASE: 'bg-gradient-to-r from-zinc-600 to-zinc-700 text-white',
};

const SIGNO_EMOJI: Record<string, string> = {
    'Aries': '♈', 'Tauro': '♉', 'Géminis': '♊', 'Cáncer': '♋', 'Leo': '♌', 'Virgo': '♍',
    'Libra': '♎', 'Escorpio': '♏', 'Sagitario': '♐', 'Capricornio': '♑', 'Acuario': '♒', 'Piscis': '♓',
};

type Screen = 'telefono' | 'registro' | 'perfil' | 'pedido' | 'seguimiento';

export default function ClientePage() {
    const [screen, setScreen] = useState<Screen>('telefono');
    const [telefono, setTelefono] = useState('');
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [menu, setMenu] = useState<Producto[]>([]);
    const [seleccion, setSeleccion] = useState<Record<string, number>>({});
    const [notas, setNotas] = useState('');
    const [pedidoActual, setPedidoActual] = useState<Pedido | null>(null);
    const [loading, setLoading] = useState(false);
    const [forma, setForma] = useState({ nombre: '', bebidaFavorita: '' });
    const [rawDate, setRawDate] = useState(''); // YYYY-MM-DD para el date picker
    const [cumpleanos, setCumpleanos] = useState(''); // DD/MM/YYYY guardado
    const [error, setError] = useState('');

    // Buscar cliente por teléfono
    async function buscarCliente() {
        if (telefono.length < 10) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/clientes?telefono=${telefono}`);
            if (!res.ok) throw new Error('Error de red');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (data.cliente) {
                setCliente(data.cliente);
                setScreen('perfil');
            } else {
                setScreen('registro');
            }
        } catch (e) {
            setError('Error al buscar cliente. ¿Hay conexión a internet?');
        } finally {
            setLoading(false);
        }
    }

    // Registrar cliente nuevo
    async function registrar() {
        if (!forma.nombre || !telefono) return;
        if (!cumpleanos) { setError('Por favor ingresa tu fecha de cumpleaños'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...forma, cumpleanos, telefono }),
            });
            if (!res.ok) throw new Error('Error de red');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (data.ok) {
                setCliente({
                    nombre: forma.nombre, telefono,
                    signo: data.signo, bebidaFavorita: forma.bebidaFavorita,
                    cumpleanos, visitas: 1,
                    ultimaVisita: new Date().toLocaleDateString('es-MX'),
                    totalGastado: 0, puntos: 0, nivel: 'BASE',
                });
                setScreen('perfil');
            }
        } catch (e) {
            setError('Error al registrarse. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    // Cargar menú
    async function cargarMenu() {
        const res = await fetch('/api/menu');
        const data = await res.json();
        setMenu(data.menu || []);
        setScreen('pedido');
    }

    // Enviar pedido
    async function enviarPedido() {
        const items = Object.entries(seleccion).filter(([, q]) => q > 0);
        if (!items.length || !cliente) return;
        setLoading(true);
        setError('');
        try {
            const productos = items.map(([nombre, q]) => q > 1 ? `${q}x ${nombre}` : nombre).join(', ');
            const total = items.reduce((sum, [nombre, q]) => {
                const p = menu.find(m => m.nombre === nombre);
                return sum + (p?.precio || 0) * q;
            }, 0);
            // Fecha local del cliente (browser sabe la zona horaria correcta)
            const fechaLocal = new Date().toLocaleDateString('es-MX');
            const res = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: cliente.nombre, telefono: cliente.telefono,
                    nivel: cliente.nivel, productos, totalEstimado: total,
                    notas, fecha: fechaLocal,
                }),
            });
            if (!res.ok) throw new Error('Error de red');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (data.ok) {
                setPedidoActual({ id: data.id, estado: 'Enviado', productos, tEnviado: new Date().toISOString() });
                setScreen('seguimiento');
            }
        } catch (e) {
            setError('Error al enviar el pedido. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    // Polling para seguimiento del pedido — busca por ID incluyendo estado Listo
    useEffect(() => {
        if (screen !== 'seguimiento' || !pedidoActual) return;
        if (pedidoActual.estado === 'Listo') return; // ya terminó, no seguir polling
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/pedidos?id=${pedidoActual.id}`);
                const data = await res.json();
                if (data.pedido) setPedidoActual(data.pedido);
            } catch { /* silencioso */ }
        }, 6000);
        return () => clearInterval(interval);
    }, [screen, pedidoActual]);

    const categorias = [...new Set(menu.map(p => p.categoria))];
    const total = Object.entries(seleccion).reduce((sum, [nombre, q]) => {
        const p = menu.find(m => m.nombre === nombre);
        return sum + (p?.precio || 0) * q;
    }, 0);

    // ── Pantallas ──────────────────────────────────────────────────────────────

    if (screen === 'telefono') return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-6">
            <div className="w-full max-w-sm">
                <div className="bg-zinc-800/80 border border-zinc-700 rounded-2xl p-8 text-white">
                    <div className="text-center mb-8">
                        <div className="text-5xl mb-3">☕</div>
                        <h1 className="text-2xl font-bold">Bienvenido</h1>
                        <p className="text-zinc-400 text-sm mt-1">Ingresa tu teléfono para continuar</p>
                    </div>
                    <div className="space-y-4">
                        <input
                            type="tel" placeholder="Teléfono (10 dígitos)"
                            value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            onKeyDown={e => e.key === 'Enter' && buscarCliente()}
                            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:border-amber-400"
                        />
                        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3" onClick={buscarCliente} disabled={loading || telefono.length < 10}>
                            {loading ? 'Buscando...' : 'Continuar →'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (screen === 'registro') return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-6">
            <Card className="w-full max-w-sm p-8 bg-zinc-800/80 border-zinc-700 text-white">
                <div className="text-center mb-6">
                    <div className="text-4xl mb-2">👋</div>
                    <h2 className="text-xl font-bold">¡Eres nuevo!</h2>
                    <p className="text-zinc-400 text-sm mt-1">Regístrate para acumular puntos</p>
                </div>
                <div className="space-y-3">
                    <input placeholder="Nombre completo" value={forma.nombre}
                        onChange={e => setForma(f => ({ ...f, nombre: e.target.value }))}
                        className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-400 text-white" />
                    <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Fecha de cumpleaños <span className="text-red-400">*</span></label>
                        <input
                            type="date"
                            value={rawDate}
                            onChange={e => {
                                const val = e.target.value; // YYYY-MM-DD
                                setRawDate(val);
                                if (val) {
                                    const [y, m, d] = val.split('-');
                                    setCumpleanos(`${d}/${m}/${y}`);
                                } else {
                                    setCumpleanos('');
                                }
                            }}
                            className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-400 text-white" />
                        {cumpleanos && <p className="text-xs text-zinc-400 mt-1">📅 {cumpleanos}</p>}
                    </div>
                    <input placeholder="Bebida favorita (opcional)" value={forma.bebidaFavorita}
                        onChange={e => setForma(f => ({ ...f, bebidaFavorita: e.target.value }))}
                        className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-400 text-white" />
                    {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 mt-2" onClick={registrar} disabled={loading || !forma.nombre}>
                        {loading ? 'Registrando...' : '✨ Registrarme'}
                    </Button>
                </div>
            </Card>
        </div>
    );

    if (screen === 'perfil' && cliente) return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
            <div className="max-w-sm mx-auto space-y-4">
                {/* Perfil header */}
                <Card className="p-6 bg-zinc-800/80 border-zinc-700 text-white">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold">Hola, {cliente.nombre.split(' ')[0]}! 👋</h2>
                            <p className="text-zinc-400 text-sm">{SIGNO_EMOJI[cliente.signo]} {cliente.signo}</p>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${NIVEL_COLORS[cliente.nivel]}`}>
                            {cliente.nivel === 'TOP' ? '🏆' : cliente.nivel === 'MEDIO' ? '⭐' : '🔵'} {cliente.nivel}
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-zinc-700/50 rounded-lg p-3">
                            <div className="text-xl font-bold text-amber-400">{cliente.puntos}</div>
                            <div className="text-xs text-zinc-400">Puntos</div>
                        </div>
                        <div className="bg-zinc-700/50 rounded-lg p-3">
                            <div className="text-xl font-bold text-blue-400">{cliente.visitas}</div>
                            <div className="text-xs text-zinc-400">Visitas</div>
                        </div>
                        <div className="bg-zinc-700/50 rounded-lg p-3">
                            <div className="text-xl font-bold text-green-400">${cliente.totalGastado}</div>
                            <div className="text-xs text-zinc-400">Total</div>
                        </div>
                    </div>
                </Card>

                {/* Bebida favorita */}
                {cliente.bebidaFavorita && (
                    <Card className="p-4 bg-zinc-800/80 border-zinc-700 text-white">
                        <p className="text-sm text-zinc-400">Tu bebida favorita</p>
                        <p className="font-semibold">☕ {cliente.bebidaFavorita}</p>
                    </Card>
                )}

                {/* Botón hacer pedido */}
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-4 text-lg" onClick={cargarMenu}>
                    🛒 Hacer mi pedido
                </Button>

                <p className="text-center text-xs text-zinc-500">Última visita: {cliente.ultimaVisita}</p>
            </div>
        </div>
    );

    if (screen === 'pedido') return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 pb-32">
            <div className="sticky top-0 bg-zinc-900/95 backdrop-blur p-4 z-10 border-b border-zinc-700">
                <div className="flex items-center justify-between max-w-sm mx-auto">
                    <button onClick={() => setScreen('perfil')} className="text-zinc-400 text-sm">← Volver</button>
                    <h2 className="font-bold text-white">Menú</h2>
                    <div className="text-amber-400 font-bold">${total.toFixed(0)}</div>
                </div>
            </div>
            <div className="max-w-sm mx-auto p-4 space-y-6">
                {categorias.map(cat => (
                    <div key={cat}>
                        <h3 className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-2">{cat}</h3>
                        <div className="space-y-2">
                            {menu.filter(p => p.categoria === cat).map(p => (
                                <div key={p.nombre} className="flex items-center justify-between bg-zinc-800 rounded-lg px-4 py-3">
                                    <div>
                                        <p className="text-white text-sm font-medium">{p.nombre}</p>
                                        <p className="text-amber-400 text-xs">${p.precio}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setSeleccion(s => ({ ...s, [p.nombre]: Math.max(0, (s[p.nombre] || 0) - 1) }))}
                                            className="w-7 h-7 rounded-full bg-zinc-700 text-white flex items-center justify-center text-lg hover:bg-zinc-600">−</button>
                                        <span className="text-white text-sm w-4 text-center font-bold">{seleccion[p.nombre] || 0}</span>
                                        <button onClick={() => setSeleccion(s => ({ ...s, [p.nombre]: (s[p.nombre] || 0) + 1 }))}
                                            className="w-7 h-7 rounded-full bg-amber-500 text-black flex items-center justify-center text-lg hover:bg-amber-400">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <input placeholder="Notas especiales (sin azúcar, extra shot...)" value={notas}
                    onChange={e => setNotas(e.target.value)}
                    className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400" />
            </div>

            {/* Botón sticky */}
            {total > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900/95 backdrop-blur border-t border-zinc-700">
                    <div className="max-w-sm mx-auto">
                        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-4 text-lg" onClick={enviarPedido} disabled={loading}>
                            {loading ? 'Enviando...' : `Enviar pedido • $${total.toFixed(0)} 🚀`}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );

    if (screen === 'seguimiento' && pedidoActual) {
        const pasos = ['Enviado', 'Preparando', 'Listo'];
        const paso = pasos.indexOf(pedidoActual.estado);
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-6">
                <Card className="w-full max-w-sm p-8 bg-zinc-800/80 border-zinc-700 text-white text-center">
                    <div className="text-5xl mb-4">
                        {pedidoActual.estado === 'Enviado' ? '⏳' : pedidoActual.estado === 'Preparando' ? '👨‍🍳' : '🎉'}
                    </div>
                    <h2 className="text-xl font-bold mb-1">Tu pedido #{pedidoActual.id.slice(-4)}</h2>
                    <p className="text-zinc-400 text-sm mb-6">{pedidoActual.productos}</p>

                    {/* Stepper */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        {pasos.map((p, i) => (
                            <div key={p} className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= paso ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-400'}`}>
                                    {i < paso ? '✓' : i + 1}
                                </div>
                                <span className={`text-xs ${i === paso ? 'text-white font-bold' : 'text-zinc-500'}`}>{p}</span>
                                {i < pasos.length - 1 && <div className={`w-8 h-px ${i < paso ? 'bg-amber-500' : 'bg-zinc-700'}`} />}
                            </div>
                        ))}
                    </div>

                    {pedidoActual.estado === 'Listo' ? (
                        <div>
                            <p className="text-green-400 font-bold mb-4">¡Tu pedido está listo! 🎉</p>
                            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold" onClick={() => { setScreen('perfil'); setSeleccion({}); setNotas(''); setPedidoActual(null); }}>
                                Ver mi perfil
                            </Button>
                        </div>
                    ) : (
                        <p className="text-zinc-400 text-sm">
                            {pedidoActual.estado === 'Enviado' ? 'Esperando que el cajero confirme tu pedido...' : 'Tu pedido está siendo preparado con mucho cariño ☕'}
                        </p>
                    )}
                </Card>
            </div>
        );
    }

    return null;
}
