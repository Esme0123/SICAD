import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { loginMovil } from "@/services/employee.service";
import api from "@/services/api";
import { checkAndRequestNotifications } from "@/utils/notifications.utils";
import { User, Key, Eye, EyeOff, Loader2, AlertCircle, Mail, X, CheckCircle, RefreshCw } from "lucide-react";
import { UCBLogo } from "@/components/common/UCBLogo";

export const MobileLogin: React.FC = () => {
  const { login } = useEmployeeAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrToken = params.get("token");
    if (qrToken) {
      sessionStorage.setItem("pending_qr_token", qrToken);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    checkAndRequestNotifications();
  }, []);

  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotInput, setForgotInput] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const finalCode = codigo.trim().toUpperCase();
    if (!finalCode || !password.trim()) {
      setError("Por favor ingrese su código y contraseña");
      return;
    }

    setLoading(true);
    try {
      const res = await loginMovil({ codigo: finalCode, password });
      if (res.ok) {
        const token = res.token;
        localStorage.setItem("token", token);
        login(token, res.usuario);
        const pendingQr = sessionStorage.getItem("pending_qr_token");
        if (pendingQr) {
          sessionStorage.removeItem("pending_qr_token");
          try {
            const res = await api.post("/asistencias/marcar", { token: pendingQr }, { headers: { Authorization: `Bearer ${token}` } });
            navigate("/app/inicio", { state: { showSuccessModal: true, attendanceData: res.data }, replace: true });
          } catch (err) {
            console.error("Error al marcar QR:", err);
            alert("No se pudo registrar la asistencia con el QR escaneado.");
            navigate("/app/inicio", { replace: true });
          }
        } else {
          navigate("/app/inicio", { replace: true });
        }
      } else {
        setError(res.message || "Error al iniciar sesión");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${dark ? "dark" : ""}`}
      style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <UCBLogo size={40} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-foreground">SICAD</h1>
            <p className="text-sm text-muted-foreground mt-1">App Móvil de Empleados</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-xs font-medium px-3 py-2 rounded-lg">
              <AlertCircle size={12} />
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Código de empleado
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

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
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

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setForgotInput(""); setForgotSent(false); setForgotError(""); setForgotOpen(true); }}
              className="text-xs font-medium text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>
      </motion.div>
      {/* Modal Olvidaste tu contraseña */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setForgotOpen(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl border bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Restablecer Contraseña</h3>
              <button onClick={() => setForgotOpen(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            {forgotSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-success/20 text-success">
                  <CheckCircle size={28} />
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  Si el código/correo coincide con una cuenta activa, se enviará un enlace para restablecer tu contraseña.
                </p>
                <button
                  onClick={() => setForgotOpen(false)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ingresa tu código de empleado (ej. CC-001) o correo electrónico registrado.
                </p>

                {forgotError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold mb-1 block text-muted-foreground">Código o Correo</label>
                  <div className="flex items-center gap-2 border border-border rounded-xl px-3.5 py-2.5 bg-muted/30 focus-within:border-primary transition-colors">
                    <Mail size={16} className="text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={forgotInput}
                      onChange={(e) => setForgotInput(e.target.value)}
                      placeholder="CC-001 o correo@ucb.edu.bo"
                      className="bg-transparent outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setForgotOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted/30 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!forgotInput.trim()) { setForgotError("Ingresa tu código o correo"); return; }
                      setForgotLoading(true);
                      setForgotError("");
                      try {
                        const input = forgotInput.trim();
                        const payload = input.includes("@") ? { email: input } : { codigo: input };
                        await api.post("/auth/forgot-password", payload);
                        setForgotSent(true);
                      } catch (err: any) {
                        setForgotError(err?.response?.data?.message || err.message || "Error al procesar la solicitud");
                      } finally {
                        setForgotLoading(false);
                      }
                    }}
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? <><RefreshCw size={14} className="animate-spin" /> Enviando...</> : "Enviar enlace"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
