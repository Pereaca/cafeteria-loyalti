"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Star,
    Zap,
    Coffee,
    CalendarDays,
    CreditCard,
    Shield,
    Gift,
} from "lucide-react";

export type NivelCafe = "BASE" | "MEDIO" | "TOP";

interface LoyaltyCardProps {
    nombre: string;
    signo?: string;
    signoEmoji?: string;
    nivel: NivelCafe;
    puntos: number;
    visitas: number;
    totalGastado: number;
    ultimaVisita?: string;
    bebidaFavorita?: string;
}

const TIER_CONFIG = {
    BASE: {
        label: "Base",
        emoji: "🔵",
        color: "text-zinc-400",
        bg: "bg-zinc-800",
        border: "border-zinc-600",
        badgeBg: "bg-zinc-700 text-zinc-300 border-zinc-600",
        barColor: "bg-zinc-400",
        gradient: "from-zinc-700/40 to-zinc-900/40",
        nextTier: "MEDIO",
        puntosParaSiguiente: 500,
        benefits: [
            "Puntos por cada visita",
            "Bebida de bienvenida en tu cumpleaños",
            "Acceso al menú completo",
        ],
    },
    MEDIO: {
        label: "Medio",
        emoji: "⭐",
        color: "text-sky-400",
        bg: "bg-sky-950",
        border: "border-sky-700",
        badgeBg: "bg-sky-900 text-sky-300 border-sky-700",
        barColor: "bg-sky-400",
        gradient: "from-sky-900/40 to-zinc-900/40",
        nextTier: "TOP",
        puntosParaSiguiente: 1000,
        benefits: [
            "Todo lo de nivel Base",
            "5% de descuento en tu pedido",
            "Prioridad en temporada alta",
            "Bebida gratis cada 10 visitas",
        ],
    },
    TOP: {
        label: "Top",
        emoji: "🏆",
        color: "text-amber-400",
        bg: "bg-amber-950",
        border: "border-amber-600",
        badgeBg: "bg-amber-900 text-amber-300 border-amber-600",
        barColor: "bg-amber-400",
        gradient: "from-amber-900/40 to-zinc-900/40",
        nextTier: null,
        puntosParaSiguiente: null,
        benefits: [
            "Todo lo de nivel Medio",
            "Prioridad absoluta en la cola",
            "10% descuento permanente",
            "Bebida gratis cada 5 visitas",
            "Acceso a productos exclusivos",
        ],
    },
};

export function LoyaltyCard({
    nombre,
    signo,
    signoEmoji,
    nivel,
    puntos,
    visitas,
    totalGastado,
    ultimaVisita,
    bebidaFavorita,
}: LoyaltyCardProps) {
    const tier = TIER_CONFIG[nivel];
    const progress = tier.puntosParaSiguiente
        ? Math.min((puntos / tier.puntosParaSiguiente) * 100, 100)
        : 100;
    const primerNombre = nombre.split(" ")[0];

    return (
        <div className="w-full space-y-4">
            {/* ── Tarjeta principal ── */}
            <Card
                className={`overflow-hidden border-2 ${tier.border} bg-zinc-900 text-white`}
            >
                {/* Barra de color superior */}
                <div className={`h-1.5 w-full ${tier.barColor}`} />

                <CardHeader className="pb-0 pt-5 px-5">
                    <div className="flex items-start justify-between">
                        {/* Nombre + signo */}
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">
                                Hola, {primerNombre} {signoEmoji}
                            </h2>
                            {signo && (
                                <p className={`text-sm ${tier.color} mt-0.5`}>{signo} · Ébano Café</p>
                            )}
                        </div>
                        {/* Badge nivel */}
                        <Badge
                            className={`uppercase text-xs font-bold px-3 py-1 border ${tier.badgeBg}`}
                        >
                            {tier.emoji} {tier.label}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="px-5 pt-4 pb-5 space-y-5">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className={`rounded-xl p-3 ${tier.bg} border ${tier.border}`}>
                            <div className={`text-2xl font-black ${tier.color}`}>{puntos}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-wider">Puntos</div>
                        </div>
                        <div className="rounded-xl p-3 bg-zinc-800 border border-zinc-700">
                            <div className="text-2xl font-black text-white">{visitas}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-wider">Visitas</div>
                        </div>
                        <div className="rounded-xl p-3 bg-zinc-800 border border-zinc-700">
                            <div className="text-2xl font-black text-green-400">${totalGastado}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-wider">Total</div>
                        </div>
                    </div>

                    {/* Barra de progreso hacia siguiente nivel */}
                    {tier.puntosParaSiguiente && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-zinc-400">
                                <span className="flex items-center gap-1">
                                    <Star className={`w-3 h-3 ${tier.color}`} />
                                    {puntos.toLocaleString()} pts
                                </span>
                                <span>{tier.puntosParaSiguiente - puntos > 0 ? `${tier.puntosParaSiguiente - puntos} pts para ${tier.nextTier}` : `¡Nivel ${tier.nextTier} alcanzado!`}</span>
                            </div>
                            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full rounded-full ${tier.barColor}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                />
                            </div>
                        </div>
                    )}
                    {!tier.puntosParaSiguiente && (
                        <div className="text-center py-1">
                            <span className="text-amber-400 text-xs font-semibold">🏆 Nivel máximo alcanzado</span>
                        </div>
                    )}

                    {/* Tarjeta visual estilo crédito */}
                    <motion.div
                        className={`relative rounded-2xl overflow-hidden border ${tier.border} p-5 h-36`}
                        style={{ background: `linear-gradient(135deg, #1a1208, #0f0a06)` }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Patrón de fondo */}
                        <div className="absolute inset-0 opacity-10">
                            <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient}`} />
                        </div>

                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Coffee className={`w-5 h-5 ${tier.color}`} />
                                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">
                                        Ébano Café
                                    </span>
                                </div>
                                <Shield className={`w-4 h-4 ${tier.color}`} />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <CreditCard className="w-4 h-4" />
                                    <span className="font-mono text-sm tracking-widest">•••• •••• •••• {(puntos % 9999).toString().padStart(4, "0")}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-[10px] text-zinc-500 uppercase">Titular</div>
                                        <div className="text-white font-semibold text-sm">{nombre.toUpperCase()}</div>
                                    </div>
                                    {ultimaVisita && (
                                        <div className="text-right">
                                            <div className="text-[10px] text-zinc-500 uppercase">Última visita</div>
                                            <div className="text-zinc-300 text-xs">{ultimaVisita}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Bebida favorita */}
                    {bebidaFavorita && (
                        <div className="flex items-center gap-3 bg-zinc-800 rounded-xl px-4 py-3 border border-zinc-700">
                            <Coffee className={`w-4 h-4 ${tier.color} shrink-0`} />
                            <div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Tu bebida favorita</div>
                                <div className="text-white text-sm font-semibold">{bebidaFavorita}</div>
                            </div>
                        </div>
                    )}

                    {/* Beneficios */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Gift className={`w-4 h-4 ${tier.color}`} />
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                Tus beneficios
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {tier.benefits.map((benefit, i) => (
                                <motion.div
                                    key={i}
                                    className="flex items-center gap-2 text-sm"
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                >
                                    <Zap className={`w-3.5 h-3.5 shrink-0 ${tier.color}`} />
                                    <span className="text-zinc-300">{benefit}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
