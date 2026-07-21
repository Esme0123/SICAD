import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useEmployeeAuth } from "@/context/EmployeeAuthContext";
import { loginMovil } from "@/services/employee.service";
import { User, Key, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export const MobileLogin: React.FC = () => {
  const { login } = useEmployeeAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        login(res.token, res.usuario);
        navigate("/app/inicio", { replace: true });
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
            <span className="text-primary-foreground text-3xl font-black">S</span>
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
    </div>
  );
};
