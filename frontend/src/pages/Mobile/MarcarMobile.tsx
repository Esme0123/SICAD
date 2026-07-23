import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle, XCircle, Clock, Loader2, Key, User, Eye, EyeOff, Volume2 } from "lucide-react";
import { marcarAsistenciaMovil, MarcarResponse } from "@/services/qr.service";
import { anunciarAsistencia } from "@/utils/tts.utils";

type Phase = "input" | "submitting" | "success" | "error";

interface ScanState {
  phase:    Phase;
  response: MarcarResponse | null;
  errorMsg: string;
}

export const MobileMarcar: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const qrToken         = searchParams.get("qrToken") || searchParams.get("token") || "";
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
        anunciarAsistencia(res.empleado?.nombre || "Empleado");
        setTimeout(() => navigate("/app/inicio"), 2500);
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
    <div className={`min-h-screen flex items-center justify-center p-6 ${dark ? "dark" : ""}`}
      style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="bg-card border border-border rounded-3xl shadow-xl p-6 flex flex-col gap-6 w-full max-w-sm"
      >
        {state.phase === "input" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
            <div className="text-center mb-2">
              <h2 className="text-xl font-black text-foreground">Confirmar Marcación</h2>
              <p className="text-xs text-muted-foreground mt-1.5">
                Ingresa tu código y contraseña para registrar tu asistencia
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Código de Empleado
              </label>
              <div className="flex items-center gap-2 border border-border rounded-xl px-3.5 py-2.5 bg-muted/30 focus-within:border-primary transition-colors">
                <User size={16} className="text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="CC-001"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  className="bg-transparent outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Contraseña
              </label>
              <div className="flex items-center gap-2 border border-border rounded-xl px-3.5 py-2.5 bg-muted/30 focus-within:border-primary transition-colors">
                <Key size={16} className="text-muted-foreground shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
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
            >
              <Loader2 size={56} className="text-primary" />
            </motion.div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Procesando...</h2>
              <p className="text-xs text-muted-foreground mt-1">
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
                <Clock size={56} className="text-warning" />
              ) : (
                <CheckCircle size={56} className="text-success" />
              )}
            </motion.div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">
                {state.response.accion === "SALIDA" ? "¡Salida registrada!" : "¡Entrada registrada!"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1.5">{state.response.mensaje}</p>
              {state.response.periodo && (
                <p className="text-xs font-mono mt-3 bg-muted rounded-lg px-3 py-1.5 text-foreground">
                  {state.response.periodo}
                </p>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Volviendo al inicio...</p>
            {state.response?.empleado?.nombre && (
              <button
                onClick={() => anunciarAsistencia(state.response!.empleado!.nombre!)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Volume2 size={12} />
                Reproducir anuncio
              </button>
            )}
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
              <h2 className="text-xl font-bold text-foreground">Error al registrar</h2>
              <p className="text-sm text-muted-foreground mt-1.5">{state.errorMsg}</p>
            </div>
            {qrToken && (
              <button
                onClick={() => setState({ phase: "input", response: null, errorMsg: "" })}
                className="mt-4 px-6 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
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
