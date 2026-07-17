import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle, XCircle, Clock, Loader2, Key, User, Eye, EyeOff } from "lucide-react";
import { marcarAsistenciaMovil, MarcarResponse } from "@/services/qr.service";

type Phase = "input" | "submitting" | "success" | "error";

interface ScanState {
  phase:    Phase;
  response: MarcarResponse | null;
  errorMsg: string;
}

export const ScanProcessor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const qrToken         = searchParams.get("qrToken") || searchParams.get("token") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");

  const [state, setState] = useState<ScanState>({
    phase:    qrToken ? "input" : "error",
    response: null,
    errorMsg: qrToken ? "" : "Token QR no proporcionado. Por favor, escanee el código QR nuevamente.",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = codigo.trim().toUpperCase();
    if (!finalCode || !password.trim()) {
      alert("Por favor ingrese su código de empleado y contraseña.");
      return;
    }

    setState({ phase: "submitting", response: null, errorMsg: "" });

    try {
      const res = await marcarAsistenciaMovil(decodeURIComponent(qrToken), finalCode, password);
      if (res.ok) {
        setState({ phase: "success", response: res, errorMsg: "" });

        // Redirigir a la vista de éxito con datos para personalizar el mensaje
        setTimeout(() => {
          navigate("/attendance/success", {
            state: {
              markType:     mapEstadoToMarkType(res.estado),
              employeeName: res.empleado?.nombre ?? "Empleado",
              period:       res.periodo ?? "",
            },
          });
        }, 1800);
      } else {
        setState({
          phase:    "error",
          response: null,
          errorMsg: "No se pudo registrar la asistencia. Inténtalo de nuevo.",
        });
      }
    } catch (err: any) {
      const message: string = err?.response?.data?.message ?? err?.message ?? "Error de red o servidor";
      setState({
        phase:    "error",
        response: null,
        errorMsg: message,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-8 flex flex-col gap-6 w-full max-w-sm"
      >
        {state.phase === "input" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Confirmar Marcación</h2>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-1.5">
                Ingresa tu código y contraseña para registrar tu asistencia
              </p>
            </div>

            {/* Código de Empleado */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-white/60">
                Código de Empleado
              </label>
              <div className="flex items-center gap-2 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 bg-slate-50/50 dark:bg-black/20 focus-within:border-primary transition-colors">
                <User size={16} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="CC-001"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  className="bg-transparent outline-none text-sm w-full text-slate-800 dark:text-white placeholder-slate-400"
                  required
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-white/60">
                Contraseña
              </label>
              <div className="flex items-center gap-2 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 bg-slate-50/50 dark:bg-black/20 focus-within:border-primary transition-colors">
                <Key size={16} className="text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent outline-none text-sm w-full text-slate-800 dark:text-white placeholder-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botón enviar */}
            <button
              type="submit"
              className="mt-2 w-full py-3 rounded-xl bg-primary hover:opacity-90 active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer shadow-md"
            >
              Registrar Asistencia
            </button>
          </form>
        )}

        {state.phase === "submitting" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="text-primary"
            >
              <Loader2 size={56} />
            </motion.div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Procesando...</h2>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
                Registrando tu marca de asistencia
              </p>
            </div>
          </div>
        )}

        {state.phase === "success" && state.response && (
          <div className="flex flex-col items-center gap-4 py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 350, delay: 0.1 }}
            >
              {state.response.estado === "Atraso" ? (
                <Clock size={56} className="text-yellow-500" />
              ) : state.response.accion === "SALIDA" ? (
                <CheckCircle size={56} className="text-primary" />
              ) : (
                <CheckCircle size={56} className="text-green-500" />
              )}
            </motion.div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {state.response.accion === "SALIDA"
                  ? "¡Salida registrada!"
                  : state.response.estado === "Atraso"
                  ? "Entrada con atraso"
                  : "¡Entrada registrada!"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-1.5">{state.response.mensaje}</p>
              {state.response.periodo && (
                <p className="text-xs font-mono mt-3 bg-slate-100 dark:bg-white/5 rounded-lg px-3 py-1.5 text-slate-600 dark:text-white/70">
                  {state.response.periodo}
                </p>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Redirigiendo...</p>
          </div>
        )}

        {state.phase === "error" && (
          <div className="flex flex-col items-center gap-4 py-4 w-full">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 350, delay: 0.1 }}
            >
              <XCircle size={56} className="text-destructive" />
            </motion.div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Error al registrar</h2>
              <p className="text-sm text-slate-500 dark:text-white/40 mt-1.5">{state.errorMsg}</p>
            </div>
            {qrToken && (
              <button
                onClick={() => setState({ phase: "input", response: null, errorMsg: "" })}
                className="mt-4 px-6 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Intentar de nuevo
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

function mapEstadoToMarkType(
  estado: MarcarResponse["estado"]
): "entrada" | "atraso" | "permiso" | "salida" | "ausente" {
  switch (estado) {
    case "A tiempo": return "entrada";
    case "Atraso":   return "atraso";
    case "Salida":   return "salida";
    default:         return "entrada";
  }
}
