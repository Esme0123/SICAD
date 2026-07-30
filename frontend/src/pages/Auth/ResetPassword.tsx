import { useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Lock, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { UCBLogo } from "@/components/common/UCBLogo";
import { resetPassword } from "@/services/auth.service";

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const token = searchParams.get("token") || "";

  // 💡 DETECCIÓN DINÁMICA: Detecta si viene de la app o de la web
  const fromParam = searchParams.get("from") || searchParams.get("source");
  const isApp = fromParam === "app" || location.pathname.startsWith("/app");
  const loginPath = isApp ? "/app/login" : "/login";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("El enlace de restablecimiento no es válido o falta el token.");
      return;
    }

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, newPassword);
      if (result.ok) {
        setSuccess(true);
      } else {
        setError(result.message || "Error al restablecer la contraseña");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex w-full h-screen overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full max-w-md rounded-2xl shadow-2xl border p-10"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex flex-col items-center mb-6">
            <UCBLogo size={52} />
            <h2 className="text-2xl font-bold mt-4" style={{ color: "var(--foreground)" }}>
              Restablecer Contraseña
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
              Ingresa tu nueva contraseña
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4 py-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                style={{ background: "rgba(34,197,94,0.15)" }}
              >
                <CheckCircle size={32} style={{ color: "#22c55e" }} />
              </div>
              <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                Contraseña actualizada
              </h3>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Tu contraseña se ha actualizado correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>

              {/* 🔘 Botón con redirección dinámica */}
              <button
                onClick={() => navigate(loginPath)}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 cursor-pointer"
                style={{ background: "var(--primary)" }}
              >
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
                >
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
                    style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>
                  Confirmar Contraseña
                </label>
                <input
                  type={showPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
                  style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                style={{ background: "var(--primary)" }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Actualizando...
                  </>
                ) : (
                  "Actualizar Contraseña"
                )}
              </motion.button>
            </form>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ResetPassword;