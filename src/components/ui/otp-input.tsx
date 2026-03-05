"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coffee, ShieldCheck } from "lucide-react";

interface OtpInputProps {
    length?: number;
    onComplete: (code: string) => void;
    onResend: () => void;
    telefono: string;
    loading?: boolean;
    error?: string;
}

export function OtpInput({ length = 6, onComplete, onResend, telefono, loading, error }: OtpInputProps) {
    const [values, setValues] = useState<string[]>(Array(length).fill(""));
    const [shake, setShake] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer
    useEffect(() => {
        if (countdown <= 0) { setCanResend(true); return; }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    // Shake on error
    useEffect(() => {
        if (error) {
            setShake(true);
            setValues(Array(length).fill(""));
            inputs.current[0]?.focus();
            setTimeout(() => setShake(false), 500);
        }
    }, [error, length]);

    function handleChange(idx: number, val: string) {
        if (!/^\d*$/.test(val)) return;
        const digit = val.slice(-1);
        const next = [...values];
        next[idx] = digit;
        setValues(next);
        if (digit && idx < length - 1) inputs.current[idx + 1]?.focus();
        if (next.every(v => v !== "") && next.join("").length === length) {
            onComplete(next.join(""));
        }
    }

    function handleKeyDown(idx: number, e: React.KeyboardEvent) {
        if (e.key === "Backspace" && !values[idx] && idx > 0) {
            inputs.current[idx - 1]?.focus();
        }
    }

    function handlePaste(e: React.ClipboardEvent) {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        if (!pasted) return;
        const next = Array(length).fill("").map((_, i) => pasted[i] || "");
        setValues(next);
        inputs.current[Math.min(pasted.length, length - 1)]?.focus();
        if (pasted.length === length) onComplete(pasted);
    }

    function handleResend() {
        if (!canResend) return;
        setValues(Array(length).fill(""));
        setCountdown(60);
        setCanResend(false);
        onResend();
    }

    const maskedPhone = `+52 *** ***${telefono.slice(-4)}`;

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0F0A06] p-6 w-full">
            <div className="max-w-md w-full space-y-8 text-center">
                {/* Logo */}
                <motion.div
                    className="flex flex-col items-center gap-3"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <Coffee className="w-10 h-10 text-amber-500" />
                    </div>
                    <p className="text-amber-600/60 text-xs uppercase tracking-widest font-bold">Ébano Café</p>
                </motion.div>

                {/* Title */}
                <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <ShieldCheck className="w-5 h-5 text-amber-400" />
                        <h2 className="text-2xl font-bold text-white">Verificación</h2>
                    </div>
                    <p className="text-sm text-zinc-400">
                        Enviamos un código de {length} dígitos por WhatsApp a
                    </p>
                    <p className="text-amber-400 font-mono font-semibold">{maskedPhone}</p>
                </motion.div>

                {/* OTP boxes */}
                <motion.div
                    className="flex justify-center gap-3"
                    animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    onPaste={handlePaste}
                >
                    {values.map((val, idx) => (
                        <input
                            key={idx}
                            ref={el => { inputs.current[idx] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={val}
                            autoFocus={idx === 0}
                            onChange={e => handleChange(idx, e.target.value)}
                            onKeyDown={e => handleKeyDown(idx, e)}
                            disabled={loading}
                            className={`
                w-12 h-14 text-center text-xl font-bold rounded-xl
                border-2 bg-zinc-900 text-white
                outline-none transition-all duration-200
                ${val ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-zinc-700"}
                ${error ? "border-red-500" : "focus:border-amber-500"}
                disabled:opacity-40
              `}
                        />
                    ))}
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.p
                            className="text-red-400 text-sm"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            {error}
                        </motion.p>
                    )}
                </AnimatePresence>

                {/* Loading state */}
                {loading && (
                    <motion.div
                        className="flex items-center justify-center gap-2 text-amber-400 text-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <motion.div
                            className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        />
                        Verificando...
                    </motion.div>
                )}

                {/* Resend */}
                <div className="text-sm text-zinc-500">
                    ¿No recibiste el código?{" "}
                    {canResend ? (
                        <button
                            onClick={handleResend}
                            className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition-colors"
                        >
                            Reenviar ahora
                        </button>
                    ) : (
                        <span className="text-zinc-600">
                            Reenviar en <span className="text-amber-600 font-mono">{countdown}s</span>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
